/* ==========================================================================
   클린팩토리 — main.js
   지침: 모든 초기화 로직은 setupXxx() 형태의 독립 함수로 작성하고
   부작용 없이 init()에서만 호출한다.
   ========================================================================== */

/**
 * 헤더 햄버거 메뉴. 누르면 섹션 목록 드롭다운이 열리고,
 * 항목을 클릭하거나 바깥을 클릭하거나 Esc를 누르면 닫힌다.
 */
function setupSiteNav() {
  const toggle = document.getElementById("navToggle");
  const panel = document.getElementById("siteNavPanel");
  if (!toggle || !panel) return;

  function close() {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }

  function open() {
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
  }

  toggle.addEventListener("click", () => {
    if (panel.hidden) {
      open();
    } else {
      close();
    }
  });

  panel.querySelectorAll(".site-nav-link").forEach((link) => {
    link.addEventListener("click", close);
  });

  document.addEventListener("click", (e) => {
    if (panel.hidden) return;
    if (panel.contains(e.target) || toggle.contains(e.target)) return;
    close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) close();
  });
}

/**
 * 전후 비교 슬라이더.
 * 마우스 드래그, 터치 드래그, 트랙 클릭, 키보드(←/→/Home/End)를 모두 지원한다.
 * Pointer Events로 마우스·터치·펜을 하나의 핸들러로 처리한다.
 */
function setupCompareSliders() {
  const compares = document.querySelectorAll("[data-compare]");

  compares.forEach((root) => {
    const media = root.querySelector(".compare-media");
    const handle = root.querySelector(".compare-handle");
    if (!media || !handle) return;

    let percent = 50;
    let dragging = false;

    function apply(pct) {
      percent = Math.min(100, Math.max(0, pct));
      media.style.setProperty("--reveal", percent + "%");
      handle.setAttribute("aria-valuenow", String(Math.round(percent)));
    }

    function percentFromClientX(clientX) {
      const rect = media.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * 100;
    }

    handle.addEventListener("pointerdown", (e) => {
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      handle.focus();
    });

    handle.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      apply(percentFromClientX(e.clientX));
    });

    function stopDragging() {
      dragging = false;
    }
    handle.addEventListener("pointerup", stopDragging);
    handle.addEventListener("pointercancel", stopDragging);

    // 손잡이 바깥, 사진 영역 아무 곳이나 눌러도 그 위치로 즉시 이동
    media.addEventListener("pointerdown", (e) => {
      if (e.target === handle || handle.contains(e.target)) return;
      apply(percentFromClientX(e.clientX));
    });

    // 키보드 접근성: 방향키로 5%씩, Home/End로 양 끝까지
    handle.addEventListener("keydown", (e) => {
      const step = 5;
      if (e.key === "ArrowLeft") {
        apply(percent - step);
      } else if (e.key === "ArrowRight") {
        apply(percent + step);
      } else if (e.key === "Home") {
        apply(0);
      } else if (e.key === "End") {
        apply(100);
      } else {
        return;
      }
      e.preventDefault();
    });

    apply(50);
  });
}

/**
 * 후기 월(wall). 각 트랙의 카드를 한 번 더 복제해서 이어붙이면
 * translateY(-50%) 애니메이션이 끊김 없이 반복되는 것처럼 보인다.
 * 복제본은 스크린리더가 같은 후기를 두 번 읽지 않도록 aria-hidden 처리한다.
 * prefers-reduced-motion이면 복제만 하고 애니메이션은 켜지 않는다.
 */
function setupReviewsMarquee() {
  const tracks = document.querySelectorAll(".reviews-track");
  if (!tracks.length) return;

  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  tracks.forEach((track) => {
    const originalItems = Array.from(track.children);
    originalItems.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });

    if (!prefersReduced) {
      track.classList.add("is-animated");
    }
  });
}

/**
 * 후기 "더보기". 모바일(CSS 640px 이하)에서만 실제로 뭔가를 가리는
 * .is-collapsed 클래스를 눌렀을 때 벗겨낸다. 데스크톱에서는
 * 이 클래스가 있어도 CSS가 무시하므로 버튼 자체가 안 보인다.
 */
function setupReviewsMoreToggle() {
  const marquee = document.querySelector(".reviews-marquee");
  const button = document.querySelector("[data-reviews-more]");
  if (!marquee || !button) return;

  button.addEventListener("click", () => {
    marquee.classList.remove("is-collapsed");
    button.hidden = true;
  });
}

/**
 * 문의 폼. FormSubmit(formsubmit.co)의 AJAX 엔드포인트로 제출해
 * 페이지 이동 없이 접수 결과를 바로 보여준다. 백엔드·DB·계정 가입
 * 없이 이메일로만 접수된다 — 처음 한 번만 그 이메일로 확인 메일이
 * 오고, 링크를 클릭해야 그 다음부터 실제로 도착한다.
 * _honey 필드가 채워져 있으면 스팸으로 보고 조용히 무시한다.
 */
function setupContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const status = form.querySelector("[data-contact-status]");
  const submitBtn = form.querySelector(".contact-submit");
  const ajaxAction = form.getAttribute("data-ajax-action");

  function setStatus(message, kind) {
    if (!status) return;
    status.textContent = message;
    status.classList.remove("is-success", "is-error");
    if (kind) status.classList.add(kind);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const honeypot = form.querySelector('input[name="_honey"]');
    if (honeypot && honeypot.value) {
      // 봇으로 판단 — 사용자에게는 성공한 것처럼만 보여주고 실제 전송은 막는다
      form.reset();
      setStatus("문의가 접수되었습니다. 확인 후 연락드릴게요.", "is-success");
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    setStatus("접수하는 중입니다...", null);

    try {
      const response = await fetch(ajaxAction, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });

      if (response.ok) {
        form.reset();
        setStatus(
          "문의가 접수되었습니다. 확인하는 대로 연락드릴게요.",
          "is-success"
        );
      } else {
        setStatus(
          "접수 중 문제가 생겼습니다. 전화로 문의해 주세요: 010-2198-5949",
          "is-error"
        );
      }
    } catch (err) {
      setStatus(
        "접수 중 문제가 생겼습니다. 전화로 문의해 주세요: 010-2198-5949",
        "is-error"
      );
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

function init() {
  setupSiteNav();
  setupCompareSliders();
  setupReviewsMarquee();
  setupReviewsMoreToggle();
  setupContactForm();
}

document.addEventListener("DOMContentLoaded", init);
