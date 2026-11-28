// Plein écran, transfert d'état par pop-up Blob (embed / Google Sites) & Screen Wake Lock.
(function () {
  const RT = (window.AssemblageRuntime = window.AssemblageRuntime || {});

  RT.initFullscreenAndWakeLock = function initFullscreenAndWakeLock(deps) {
    const getCurrentScenarioId = deps.getCurrentScenarioId;
    const getCurrentSlotId = deps.getCurrentSlotId;
    const getUseJoystick = deps.getUseJoystick;
    const setUseJoystick = deps.setUseJoystick;
    const getFsPaused = deps.getFsPaused;
    const setFsPaused = deps.setFsPaused;
    const buildSavePayload = deps.buildSavePayload;
    const saveCurrentSlot = deps.saveCurrentSlot;
    const applySaveObject = deps.applySaveObject;
    const showToast = deps.showToast;

    const fsBtnEl = document.getElementById("fullscreen-btn");
    const initialDocumentHtml = document.documentElement ? document.documentElement.outerHTML : "";
    const fsIconEnterEl = document.getElementById("fs-icon-enter");
    const fsIconExitEl = document.getElementById("fs-icon-exit");
    const fsPauseOverlayEl = document.getElementById("fs-pause-overlay");
    const btnResumeHereEl = document.getElementById("btn-resume-here");
    const btnFallbackFsLinkEl = document.getElementById("btn-fallback-fs-link");
    let fsPopupCheckInterval = null;
    let activeFullscreenBlobUrl = null;
    let screenWakeLock = null;
    let wakeLockRequestInFlight = false;

    function isIPhoneDevice() {
      const ua = navigator.userAgent || "";
      const platform = navigator.platform || "";
      if (/iPhone|iPod/i.test(ua) || /iPhone|iPod/i.test(platform)) return true;
      const docEl = document.documentElement;
      const hasDomFs = !!(
        docEl && (
          docEl.requestFullscreen ||
          docEl.webkitRequestFullscreen ||
          docEl.mozRequestFullScreen ||
          docEl.msRequestFullscreen
        )
      );
      if (navigator.maxTouchPoints > 1 && !hasDomFs) return true;
      return false;
    }

    if (fsBtnEl && isIPhoneDevice()) {
      fsBtnEl.style.display = "none";
    }

    function isFullScreen() {
      return !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
    }

    function updateFsIcons() {
      const isFs = isFullScreen();
      if (fsIconEnterEl) fsIconEnterEl.style.display = isFs ? "none" : "block";
      if (fsIconExitEl) fsIconExitEl.style.display = isFs ? "block" : "none";
    }

    async function requestScreenWakeLock() {
      if (getFsPaused() || document.hidden) return;
      if (screenWakeLock || wakeLockRequestInFlight) return;
      if (!("wakeLock" in navigator) || !navigator.wakeLock || typeof navigator.wakeLock.request !== "function") return;
      wakeLockRequestInFlight = true;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (getFsPaused() || document.hidden) {
          try { await sentinel.release(); } catch (_) {}
          return;
        }
        screenWakeLock = sentinel;
        sentinel.addEventListener("release", () => {
          if (screenWakeLock === sentinel) screenWakeLock = null;
        });
      } catch (_) {
        // Peut échouer hors HTTPS, dans un iframe sans allow="screen-wake-lock" ou avant un geste utilisateur
      } finally {
        wakeLockRequestInFlight = false;
      }
    }

    function releaseScreenWakeLock() {
      const sentinel = screenWakeLock;
      screenWakeLock = null;
      if (sentinel) {
        try { sentinel.release().catch(() => {}); } catch (_) {}
      }
    }

    function pauseOldWindowForFullscreen(childWin, fallbackUrl) {
      setFsPaused(true);
      releaseScreenWakeLock();
      if (fsPauseOverlayEl) fsPauseOverlayEl.classList.add("open");
      if (btnFallbackFsLinkEl) {
        if (fallbackUrl) {
          btnFallbackFsLinkEl.href = fallbackUrl;
          btnFallbackFsLinkEl.style.display = "inline-block";
        } else {
          btnFallbackFsLinkEl.style.display = "none";
        }
      }
      if (fsPopupCheckInterval) {
        clearInterval(fsPopupCheckInterval);
        fsPopupCheckInterval = null;
      }
      if (childWin) {
        fsPopupCheckInterval = setInterval(() => {
          try {
            if (childWin.closed) {
              clearInterval(fsPopupCheckInterval);
              fsPopupCheckInterval = null;
              if (getFsPaused()) resumeCurrentWindow();
            }
          } catch (_) {}
        }, 500);
      }
    }

    function resumeCurrentWindow() {
      if (fsPopupCheckInterval) {
        clearInterval(fsPopupCheckInterval);
        fsPopupCheckInterval = null;
      }
      if (activeFullscreenBlobUrl) {
        try { URL.revokeObjectURL(activeFullscreenBlobUrl); } catch (_) {}
        activeFullscreenBlobUrl = null;
      }
      setFsPaused(false);
      if (fsPauseOverlayEl) fsPauseOverlayEl.classList.remove("open");
      if (btnFallbackFsLinkEl) btnFallbackFsLinkEl.style.display = "none";
      requestScreenWakeLock();
      showToast("🛸 Partie reprise dans cette fenêtre !");
    }

    if (btnResumeHereEl) {
      btnResumeHereEl.addEventListener("click", resumeCurrentWindow);
    }
    if (btnFallbackFsLinkEl) {
      btnFallbackFsLinkEl.addEventListener("click", () => {
        if (!getFsPaused()) {
          pauseOldWindowForFullscreen(null, btnFallbackFsLinkEl.href);
        }
      });
    }

    function notifyOpenerState(msgType) {
      try {
        if (window.opener && !window.opener.closed) {
          const slotId = getCurrentSlotId();
          window.opener.postMessage({
            type: msgType,
            scenarioId: getCurrentScenarioId(),
            slotId,
            payload: buildSavePayload(slotId),
            useJoystick: getUseJoystick(),
          }, "*");
        }
      } catch (_) {}
    }

    window.addEventListener("message", (event) => {
      const msg = event && event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "assemblage_state_sync" || msg.type === "assemblage_popup_closed") {
        if (msg.scenarioId && String(msg.scenarioId) !== getCurrentScenarioId()) {
          if (msg.type === "assemblage_popup_closed" && getFsPaused()) {
            resumeCurrentWindow();
          }
          return;
        }
        if (typeof msg.useJoystick === "boolean") {
          setUseJoystick(msg.useJoystick, true);
        }
        if (msg.payload && typeof msg.payload === "object") {
          const slotId = msg.slotId || getCurrentSlotId();
          applySaveObject(msg.payload, slotId, true);
          saveCurrentSlot(true, getCurrentSlotId());
        }
        if (msg.type === "assemblage_popup_closed" && getFsPaused()) {
          resumeCurrentWindow();
        }
      }
    });

    function openFullTabFallback() {
      saveCurrentSlot(true);
      const slotId = getCurrentSlotId();
      const transferState = {
        slotId,
        payload: buildSavePayload(slotId),
        useJoystick: getUseJoystick(),
      };

      let htmlStr = initialDocumentHtml || document.documentElement.outerHTML;
      // Injecte <base href="..."> pour que les ressources relatives (runtime/, config/, extensions/) fonctionnent dans un Blob
      if (window.location.protocol !== "blob:" && !/<base\b/i.test(htmlStr)) {
        const safeBaseHref = String(window.location.href || "").replace(/"/g, "&quot;");
        htmlStr = htmlStr.replace(/<head([^>]*)>/i, `<head$1>\n<base href="${safeBaseHref}" />`);
      }

      const injectionPayload = JSON.stringify(transferState).replace(/</g, "\\u003c");
      const injectTag = "<!-- INJECT_STATE_HERE -->" +
        "<script>window.__ASSEMBLAGE_TRANSFERRED_STATE=" + injectionPayload + ";<" + "/script>" +
        "<!-- INJECT_STATE_HERE_END -->";

      const markerRe = /<!--\s*INJECT_STATE_HERE\s*-->[\s\S]*?<!--\s*INJECT_STATE_HERE_END\s*-->/;
      if (markerRe.test(htmlStr)) {
        htmlStr = htmlStr.replace(markerRe, injectTag);
      } else {
        htmlStr = htmlStr.replace(/<script\b/i, injectTag + "\n<script");
      }

      const fullHtml = "<!DOCTYPE html>\n" + htmlStr;
      if (activeFullscreenBlobUrl) {
        try { URL.revokeObjectURL(activeFullscreenBlobUrl); } catch (_) {}
        activeFullscreenBlobUrl = null;
      }

      let blobUrl = "";
      try {
        const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
        blobUrl = URL.createObjectURL(blob);
        activeFullscreenBlobUrl = blobUrl;
      } catch (_) {}

      let newWin = null;
      if (blobUrl) {
        try { newWin = window.open(blobUrl, "_blank"); } catch (_) {}
      }
      if (newWin) {
        pauseOldWindowForFullscreen(newWin, blobUrl);
        return;
      }

      let fallbackHref = blobUrl;
      if (!fallbackHref && window.location.protocol !== "blob:") {
        fallbackHref = window.location.href;
        try { newWin = window.open(fallbackHref, "_blank"); } catch (_) {}
        if (newWin) {
          pauseOldWindowForFullscreen(newWin, fallbackHref);
          return;
        }
      }

      if (fallbackHref && btnFallbackFsLinkEl) {
        btnFallbackFsLinkEl.href = fallbackHref;
        btnFallbackFsLinkEl.style.display = "inline-block";
        if (fsPauseOverlayEl) fsPauseOverlayEl.classList.add("open");
      }
      showToast("⚠️ Pop-up bloqué : utilisez le lien plein écran affiché.");
    }

    function toggleFullScreen() {
      if (isIPhoneDevice()) return;
      if (!isFullScreen()) {
        const docEl = document.documentElement;
        const fsAllowed = document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled;
        const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
        if (req && fsAllowed !== false) {
          try {
            const ret = req.call(docEl);
            if (ret && typeof ret.catch === "function") {
              ret.catch(() => openFullTabFallback());
            }
          } catch (_) {
            openFullTabFallback();
          }
        } else {
          openFullTabFallback();
        }
      } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if (exit) {
          try { exit.call(document); } catch (_) {}
        }
      }
    }

    if (fsBtnEl && !isIPhoneDevice()) {
      fsBtnEl.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFullScreen();
      });
    }
    function onFullscreenStateChanged() {
      updateFsIcons();
      if (!document.hidden && !getFsPaused()) requestScreenWakeLock();
    }
    document.addEventListener("fullscreenchange", onFullscreenStateChanged);
    document.addEventListener("webkitfullscreenchange", onFullscreenStateChanged);
    document.addEventListener("mozfullscreenchange", onFullscreenStateChanged);
    document.addEventListener("MSFullscreenChange", onFullscreenStateChanged);

    function ensureWakeLockOnUserGesture() {
      if (!screenWakeLock && !getFsPaused() && !document.hidden) {
        requestScreenWakeLock();
      }
    }
    window.addEventListener("pointerdown", ensureWakeLockOnUserGesture, { passive: true });
    window.addEventListener("touchstart", ensureWakeLockOnUserGesture, { passive: true });
    window.addEventListener("keydown", ensureWakeLockOnUserGesture, { passive: true });
    requestScreenWakeLock();

    return {
      notifyOpenerState,
      requestScreenWakeLock,
      releaseScreenWakeLock,
      isFullScreen,
      toggleFullScreen,
      openFullTabFallback,
    };
  };
})();
