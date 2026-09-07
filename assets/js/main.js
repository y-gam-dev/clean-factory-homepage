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

    // 사진 영역 전체가 아니라 손잡이(44px 폭)에서만 드래그를 받는다.
    // 예전에는 사진 아무 곳이나 눌러도 그 위치로 손잡이가 이동했는데,
    // 모바일에서는 스크롤하려고 사진을 터치한 것도 슬라이더 조작으로
    // 잡혀버려 아래로 스크롤하기 어려웠다.

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
 * 후기 "더보기". 모바일(CSS 640px 이하)에서만 보이는 버튼이다.
 * 처음엔 열(column)마다 대표 후기 2개(.is-collapsed, CSS 처리)만 보이고,
 * 누를 때마다 열마다 하나씩 더 펼쳐진다. 전부 다 펼쳐진 뒤 한 번 더
 * 누르면 처음 상태로 돌아가— 계속 눌러가며 순환한다.
 */
function setupReviewsMoreToggle() {
  const marquee = document.querySelector(".reviews-marquee");
  const button = document.querySelector("[data-reviews-more]");
  if (!marquee || !button) return;

  const INITIAL_VISIBLE = 2; // .is-collapsed 기본값과 맞춘다
  const STEP = 1; // 클릭 한 번에 열마다 한 개씩 더 보여준다

  // 마르퀴 애니메이션용으로 복제된(aria-hidden) 카드는 세지 않는다
  const columns = Array.from(marquee.querySelectorAll(".reviews-track")).map(
    (track) =>
      Array.from(track.children).filter(
        (card) => !card.hasAttribute("aria-hidden")
      )
  );
  const maxVisible = columns.reduce(
    (max, cards) => Math.max(max, cards.length),
    INITIAL_VISIBLE
  );

  let visible = INITIAL_VISIBLE;

  function render() {
    marquee.classList.remove("is-collapsed");
    columns.forEach((cards) => {
      cards.forEach((card, i) => {
        card.hidden = i >= visible;
      });
    });
  }

  button.addEventListener("click", () => {
    visible =
      visible >= maxVisible
        ? INITIAL_VISIBLE
        : Math.min(visible + STEP, maxVisible);
    render();
  });
}

/**
 * 문의 폼. Web3Forms(api.web3forms.com)의 AJAX 엔드포인트로 제출해
 * 페이지 이동 없이 접수 결과를 바로 보여준다. 백엔드·DB 없이
 * access_key 하나로 이메일 접수만 이뤄진다.
 * 응답 JSON에 success 필드가 오므로 그 값으로 성공/실패를 정확히
 * 판단한다 — 이전에 쓰던 FormSubmit은 이 필드가 없어 상태 코드로만
 * 추측해야 했고, 그마저 응답이 없을 때는 성공 여부를 알 수 없었다.
 * _honey 필드가 채워져 있으면 스팸으로 보고 조용히 무시한다.
 */
function setupContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const status = form.querySelector("[data-contact-status]");
  const submitBtn = form.querySelector(".contact-submit");
  const ajaxAction = form.getAttribute("action");

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

    // multipart/form-data로 보내면 "지역"·"기종" 같은 한글 필드 이름과
    // 값이 Web3Forms 쪽에서 깨져서 도착하는 문제가 있었다. JSON으로
    // 보내면 이 문제가 없어, FormData를 순수 객체로 변환해 보낸다.
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    // Web3Forms는 보통 응답이 빠르지만, 혹시 응답이 지연되더라도
    // 무한정 기다리게 두지 않는다. 응답이 오면 success 필드로 확실하게
    // 판단하고, 시간 내에 응답이 없을 때만 "확인 중"이라고 정직하게
    // 안내한다 — 응답 지연을 성공으로 잘못 판단하면 문의가 그냥
    // 사라져도 알 방법이 없기 때문이다.
    const timedOut = Symbol("timed-out");
    const timeout = new Promise((resolve) => {
      setTimeout(() => resolve(timedOut), 6000);
    });

    try {
      const result = await Promise.race([
        fetch(ajaxAction, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
        timeout,
      ]);

      if (result === timedOut) {
        setStatus(
          "접수가 늦어지고 있어요. 곧 연락드리겠지만, 급하시면 전화로 문의해 주세요: 010-2198-5949",
          "is-error"
        );
        return;
      }

      const data = await result.json().catch(() => null);

      if (result.ok && data && data.success) {
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
