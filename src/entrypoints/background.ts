import { MAX_SOURCE_CHARS } from '../lib/constants';
import { captureSelectionInPage, replaceSelectionInPage } from '../lib/browser/injection';
import { saveSelectionHandoff } from '../lib/storage/handoff';
import { getLocalArea, getSessionArea, getSettings } from '../lib/storage/settings';
import { parseCaptureResult } from '../lib/browser/selection';
import { streamChat } from '../lib/api/nineRouter';
import { generateInlineAlternatives } from '../lib/browser/inlineRewrite';
import {
  cancelInlineRewriteMessageSchema,
  replaceResultMessageSchema,
  replaceSelectionMessageSchema,
  runInlineRewriteMessageSchema,
  type InlineRewriteProgressMessage,
} from '../lib/browser/messages';

const activeInlineRequests = new Map<string, AbortController>();

async function sendInlineProgress(
  tabId: number,
  frameId: number,
  message: InlineRewriteProgressMessage,
): Promise<void> {
  try {
    await browser.tabs.sendMessage(tabId, message, { frameId });
  } catch {
  }
}

async function runInlineRewrite(
  request: ReturnType<typeof runInlineRewriteMessageSchema.parse>,
  tabId: number,
  frameId: number,
): Promise<{ type: 'inline-rewrite-response'; ok: boolean }> {
  const controller = new AbortController();
  activeInlineRequests.set(request.requestId, controller);
  await sendInlineProgress(tabId, frameId, {
    type: 'inline-rewrite-progress',
    requestId: request.requestId,
    status: 'started',
  });

  try {
    const settings = await getSettings(getLocalArea());
    if (!settings.selectedModel) {
      throw new Error('Choose a 9Router model in SayElse Settings first.');
    }
    const model = settings.selectedModel;
    const alternatives = await generateInlineAlternatives({
      request: {
        source: request.source,
        operation: request.operation,
        tone: request.tone,
        strength: settings.defaults.strength,
        length: request.length,
      },
      generate: (messages) => streamChat({
        model,
        token: settings.token,
        messages,
        signal: controller.signal,
        n: 2,
      }),
    });
    await sendInlineProgress(tabId, frameId, {
      type: 'inline-rewrite-progress',
      requestId: request.requestId,
      status: 'complete',
      alternatives,
    });
    return { type: 'inline-rewrite-response', ok: true };
  } catch (error) {
    const cancelled = controller.signal.aborted;
    const message = error instanceof Error ? error.message : 'Could not rewrite the selected text.';
    await sendInlineProgress(tabId, frameId, {
      type: 'inline-rewrite-progress',
      requestId: request.requestId,
      status: cancelled ? 'cancelled' : 'error',
      message: cancelled ? 'Rewrite stopped.' : message,
    });
    return { type: 'inline-rewrite-response', ok: false };
  } finally {
    activeInlineRequests.delete(request.requestId);
  }
}

function createContextMenu(): void {
  void browser.contextMenus.removeAll().then(() => {
    browser.contextMenus.create({
      id: 'sayelse-paraphrase-selection',
      title: 'Paraphrase with SayElse',
      contexts: ['selection'],
    });
  });
}

async function captureFrame(tabId: number, frameId: number): Promise<ReturnType<typeof parseCaptureResult>> {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      func: captureSelectionInPage,
      args: [MAX_SOURCE_CHARS],
    });
    return parseCaptureResult(results[0]?.result);
  } catch {
    return null;
  }
}

async function replaceSelectionInFrame(message: ReturnType<typeof replaceSelectionMessageSchema.parse>): Promise<ReturnType<typeof replaceResultMessageSchema.parse>> {
  if (!message.capture) {
    return { type: 'replace-selection-result', replaced: false, reason: 'This selection cannot be replaced safely.' };
  }

  try {
    const results = await browser.scripting.executeScript({
      target: { tabId: message.tabId, frameIds: [message.frameId] },
      func: replaceSelectionInPage,
      args: [message.capture, message.replacement],
    });
    return {
      type: 'replace-selection-result',
      replaced: results[0]?.result === true,
      reason: results[0]?.result === true ? undefined : 'The selection changed before replacement.',
    };
  } catch {
    return { type: 'replace-selection-result', replaced: false, reason: 'The page could not be updated.' };
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(createContextMenu);
  browser.runtime.onStartup.addListener(createContextMenu);

  browser.action.onClicked.addListener((tab) => {
    const tabId = tab?.id;
    if (tabId !== undefined) {
      void browser.storage.session.remove('sayelse.selection.v1');
      void browser.sidePanel.open({ tabId });
    }
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    const tabId = tab?.id;
    if (info.menuItemId !== 'sayelse-paraphrase-selection' || tabId === undefined) {
      return;
    }

    const frameId = info.frameId ?? 0;
    const fallbackSource = info.selectionText?.trim() ?? '';
    if (!fallbackSource) return;

    void (async () => {
      const capture = await captureFrame(tabId, frameId);
      await saveSelectionHandoff(
        {
          version: 1,
          source: capture?.source ?? fallbackSource,
          tabId,
          frameId,
          capturedAt: Date.now(),
          capture,
        },
        getSessionArea(),
      );
      await browser.sidePanel.open({ tabId });
    })();
  });

  browser.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (sender.id !== browser.runtime.id) {
      return false;
    }

    const cancelRequest = cancelInlineRewriteMessageSchema.safeParse(message);
    if (cancelRequest.success) {
      activeInlineRequests.get(cancelRequest.data.requestId)?.abort();
      sendResponse({ type: 'inline-rewrite-cancelled' });
      return false;
    }

    const inlineRequest = runInlineRewriteMessageSchema.safeParse(message);
    if (inlineRequest.success) {
      const tabId = sender.tab?.id;
      if (tabId === undefined) return false;
      const frameId = sender.frameId ?? 0;
      void runInlineRewrite(inlineRequest.data, tabId, frameId).then((result) => {
        sendResponse(result);
      });
      return true;
    }

    const replaceRequest = replaceSelectionMessageSchema.safeParse(message);
    if (!replaceRequest.success) {
      return false;
    }
    void replaceSelectionInFrame(replaceRequest.data).then((result) => {
      sendResponse(result);
    });
    return true;
  });
});
