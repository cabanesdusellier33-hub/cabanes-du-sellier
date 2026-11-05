/* =========================================================================
   Cabanes du Sellier — interactions & animations
   Dépendances locales : GSAP + ScrollTrigger (assets/js/vendor)
   ========================================================================= */
(function () {
  "use strict";

  var html = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var animate = !!(gsap && ScrollTrigger) && !reduce;

  html.classList.add("ready");

  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };

  if (animate) {
    gsap.registerPlugin(ScrollTrigger);
  } else {
    html.classList.add("no-anim");
    html.classList.remove("intro-on", "pt-in");
    store.del("cds-pt");
  }

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* -----------------------------------------------------------------------
     Découpage d'un texte en mots (conserve <em>, <br>, espaces insécables)
     ----------------------------------------------------------------------- */
  function splitWords(el, mode) {
    if (el.classList.contains("is-split")) return $$(mode === "flat" ? ".mw" : ".wi", el);
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/([ \t\n\r]+)/).forEach(function (part) {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var inner = document.createElement("span");
            inner.textContent = part;
            if (mode === "flat") {
              inner.className = "mw";
              frag.appendChild(inner);
            } else {
              var outer = document.createElement("span");
              outer.className = "w";
              inner.className = "wi";
              outer.appendChild(inner);
              frag.appendChild(outer);
            }
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    })(el);
    el.classList.add("is-split");
    return $$(mode === "flat" ? ".mw" : ".wi", el);
  }

  /* -----------------------------------------------------------------------
     Header : fond au défilement, masquage en descendant
     ----------------------------------------------------------------------- */
  var header = $("#header");
  var lastY = window.scrollY;
  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle("is-solid", y > 40);
      if (!html.classList.contains("menu-open")) {
        header.classList.toggle("is-hidden", y > lastY && y > 320);
      }
    }
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* -----------------------------------------------------------------------
     Menu mobile plein écran
     ----------------------------------------------------------------------- */
  var burger = $("#burger");
  var menu = $("#menu");
  function setMenu(open) {
    if (!menu || !burger) return;
    menu.classList.toggle("is-open", open);
    html.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    menu.setAttribute("aria-hidden", String(!open));
    if ("inert" in menu) menu.inert = !open;
    document.body.style.overflow = open ? "hidden" : "";
  }
  if (burger && menu) {
    setMenu(false);
    burger.addEventListener("click", function () { setMenu(!menu.classList.contains("is-open")); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    window.addEventListener("resize", function () { if (window.innerWidth > 960) setMenu(false); });
  }

  /* -----------------------------------------------------------------------
     Retour en haut & année
     ----------------------------------------------------------------------- */
  $$("[data-top]").forEach(function (b) {
    b.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
  });
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* -----------------------------------------------------------------------
     Médias : visuel de substitution si la photo / vidéo n'existe pas encore
     ----------------------------------------------------------------------- */
  $$(".media").forEach(function (media) {
    var img = $("img", media);
    var video = $("video", media);
    var miss = function () { media.classList.add("is-missing"); };
    if (img) {
      if (img.complete && img.naturalWidth === 0) miss();
      img.addEventListener("error", miss);
    }
    if (video) {
      var source = $("source", video);
      if (source) source.addEventListener("error", miss);
      video.addEventListener("error", miss);
      if (video.networkState === 3) miss();

      var play = $("button.media__play", media);
      if (play) {
        play.addEventListener("click", function () {
          if (media.classList.contains("is-missing")) return;
          video.setAttribute("controls", "");
          video.play();
          play.hidden = true;
        });
        video.addEventListener("ended", function () { play.hidden = false; video.removeAttribute("controls"); });
      }
    }
  });

  /* -----------------------------------------------------------------------
     Visionneuse photo
     ----------------------------------------------------------------------- */
  var lightbox = $("#lightbox");
  if (lightbox && typeof lightbox.showModal === "function") {
    var lbBody = $(".lightbox__body", lightbox);
    var lbCaption = $(".lightbox__caption", lightbox);
    $$(".media--zoom").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var img = $("img", btn);
        var videoSrc = btn.getAttribute("data-video");
        lbBody.innerHTML = "";
        if (videoSrc) {
          var vid = document.createElement("video");
          vid.className = "lightbox__img lightbox__video";
          vid.src = videoSrc;
          vid.controls = true;
          vid.playsInline = true;
          vid.autoplay = true;
          var poster = $("video", btn);
          if (poster && poster.poster) vid.poster = poster.poster;
          lbBody.appendChild(vid);
        } else if (img && !btn.classList.contains("is-missing")) {
          var big = document.createElement("img");
          big.className = "lightbox__img";
          big.src = img.currentSrc || img.src;
          big.alt = img.alt;
          lbBody.appendChild(big);
        } else {
          var source = $(".art", btn);
          if (!source) return;
          var art = source.cloneNode(true);
          art.classList.add("lightbox__img");
          lbBody.appendChild(art);
        }
        lbCaption.textContent = btn.getAttribute("data-title") || "";
        lightbox.showModal();
      });
    });
    $(".lightbox__close", lightbox).addEventListener("click", function () { lightbox.close(); });
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) lightbox.close(); });
    // À la fermeture : on arrête et on retire la vidéo éventuelle
    lightbox.addEventListener("close", function () { lbBody.innerHTML = ""; });
  }

  /* -----------------------------------------------------------------------
     Vidéos d'aperçu : lecture muette et en boucle uniquement quand elles sont visibles
     ----------------------------------------------------------------------- */
  var previews = $$("video[data-autoplay]");
  if (previews.length && !reduce && "IntersectionObserver" in window) {
    var videoObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          if (v.preload === "none") { v.preload = "auto"; v.load(); }
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.35 });
    previews.forEach(function (v) { videoObserver.observe(v); });
  }

  /* -----------------------------------------------------------------------
     Lecteur vidéo avec liste de lecture (page Réalisations)
     ----------------------------------------------------------------------- */
  var player = $("#player");
  if (player) {
    var pv = $(".player__video", player);
    var screen = $(".player__screen", player);
    var big = $(".player__big", player);
    var bar = $(".player__bar", player);
    var prog = $(".player__progress", player);
    var time = $(".player__time", player);
    var ambient = $(".player__ambient", player);
    var pTitle = $(".player__title", player);
    var pSub = $(".player__sub", player);
    var reels = $$(".reel");
    var seeking = false;
    var userPaused = false;
    var idleTimer = null;

    var fmt = function (t) {
      t = Math.max(0, Math.floor(t || 0));
      return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
    };

    // Le JS prend le relais : contrôles personnalisés à la place des contrôles natifs
    pv.removeAttribute("controls");
    pv.muted = true;

    var sync = function () {
      player.classList.toggle("is-playing", !pv.paused);
      player.classList.toggle("is-muted", pv.muted);
      reels.forEach(function (r) { r.classList.toggle("is-playing", !pv.paused); });
    };
    ["play", "pause", "volumechange", "ended", "loadeddata"].forEach(function (ev) { pv.addEventListener(ev, sync); });
    sync();

    var setProgress = function (ratio) {
      prog.style.setProperty("--p", ratio * 100 + "%");
      if (!seeking) prog.value = Math.round(ratio * 1000);
    };
    pv.addEventListener("timeupdate", function () {
      setProgress(pv.duration ? pv.currentTime / pv.duration : 0);
      time.textContent = fmt(pv.currentTime);
    });
    prog.addEventListener("input", function () {
      seeking = true;
      if (pv.duration) pv.currentTime = (prog.value / 1000) * pv.duration;
      prog.style.setProperty("--p", prog.value / 10 + "%");
    });
    prog.addEventListener("change", function () { seeking = false; });

    var play = function (withSound) {
      if (withSound) pv.muted = false;
      userPaused = false;
      var p = pv.play();
      // Si le navigateur refuse la lecture avec le son, on relance en muet
      if (p && p.catch) p.catch(function () { pv.muted = true; pv.play().catch(function () {}); });
    };
    var toggle = function () {
      if (pv.paused) { play(true); } else { pv.pause(); userPaused = true; }
    };

    big.addEventListener("click", function () { play(true); });
    pv.addEventListener("click", toggle);
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-act]");
      if (!btn) return;
      var act = btn.getAttribute("data-act");
      if (act === "play") toggle();
      if (act === "mute") pv.muted = !pv.muted;
      if (act === "fs") {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (screen.requestFullscreen) screen.requestFullscreen();
        else if (pv.webkitEnterFullscreen) pv.webkitEnterFullscreen();
      }
    });

    var load = function (reel, autoplay, withSound) {
      reels.forEach(function (r) {
        var on = r === reel;
        r.classList.toggle("is-active", on);
        r.setAttribute("aria-pressed", String(on));
      });
      player.classList.add("is-switching");
      setTimeout(function () {
        pv.poster = reel.getAttribute("data-poster");
        ambient.src = reel.getAttribute("data-poster");
        pv.src = reel.getAttribute("data-src");
        pTitle.textContent = reel.getAttribute("data-title");
        pSub.textContent = reel.getAttribute("data-sub");
        setProgress(0);
        time.textContent = "0:00";
        pv.load();
        player.classList.remove("is-switching");
        if (autoplay) play(withSound);
      }, 250);
    };
    reels.forEach(function (r) {
      r.addEventListener("click", function () {
        load(r, true, true);
        if (window.innerWidth <= 960) screen.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      });
    });

    // Enchaînement automatique sur la vidéo suivante
    pv.addEventListener("ended", function () {
      var i = reels.findIndex(function (r) { return r.classList.contains("is-active"); });
      load(reels[(i + 1) % reels.length], true, !pv.muted);
    });

    // Barre de contrôle masquée quand la souris ne bouge plus
    var wake = function () {
      player.classList.remove("is-idle");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { player.classList.add("is-idle"); }, 2500);
    };
    screen.addEventListener("pointermove", wake);
    screen.addEventListener("pointerdown", wake);

    // Lecture muette automatique quand le lecteur est visible (sauf si l'utilisateur a mis en pause)
    if (!reduce && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (pv.paused && !userPaused) { var p = pv.play(); if (p && p.catch) p.catch(function () {}); }
          } else if (!pv.paused) {
            pv.pause();
          }
        });
      }, { threshold: 0.5 }).observe(screen);
    }
  }

  /* -----------------------------------------------------------------------
     Comparateur avant / après
     ----------------------------------------------------------------------- */
  $$(".ba").forEach(function (box) {
    var range = $(".ba__range", box);
    if (!range) return;
    var setPos = function (v) { box.style.setProperty("--pos", v + "%"); };
    range.addEventListener("input", function () { box.classList.add("is-touched"); setPos(range.value); });
    setPos(range.value);
  });

  /* -----------------------------------------------------------------------
     Formulaire de contact → Web3Forms
     ----------------------------------------------------------------------- */
  var form = $("#contact-form");
  if (form) {
    var card = form.closest(".form-card");
    var submit = $("[type=submit]", form);
    var status = $(".form__status", form);
    var message = $("#message", form);
    var counter = $("[data-count]", form);

    if (message && counter) {
      var updateCount = function () { counter.textContent = message.value.length + " / " + message.maxLength; };
      message.addEventListener("input", updateCount);
      updateCount();
    }

    var showError = function (text) {
      status.textContent = text;
      status.classList.add("is-error");
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.classList.remove("is-error");

      // Champ piège rempli = robot : on ignore silencieusement
      if (form.botcheck && form.botcheck.checked) return;

      var key = form.access_key.value.trim();
      if (!key || key.indexOf("VOTRE") === 0) {
        showError("Le formulaire n’est pas encore relié à la boîte mail (clé Web3Forms manquante).");
        return;
      }

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.subject = "Demande de devis – " + (data.sujet || "site Cabanes du Sellier");
      data.from_name = "Site Cabanes du Sellier";

      submit.classList.add("is-loading");
      submit.disabled = true;

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, json: j }; }); })
        .then(function (res) {
          if (!res.ok || !res.json.success) throw new Error(res.json.message || "Erreur");
          form.reset();
          if (counter && message) counter.textContent = "0 / " + message.maxLength;
          card.classList.add("is-sent");
          card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
          var focusTarget = $(".form-success h3", card);
          if (focusTarget) focusTarget.focus({ preventScroll: true });
        })
        .catch(function () {
          showError("L’envoi a échoué. Merci de réessayer dans un instant ou de nous contacter directement par e-mail ou téléphone.");
        })
        .then(function () {
          submit.classList.remove("is-loading");
          submit.disabled = false;
        });
    });

    var again = $("[data-again]", card);
    if (again) again.addEventListener("click", function () { card.classList.remove("is-sent"); });
  }

  /* =======================================================================
     Tout ce qui suit nécessite GSAP (et l'absence de « réduire les animations »)
     ======================================================================= */
  if (!animate) return;

  /* -----------------------------------------------------------------------
     Transitions de page (rideau cuir + or)
     ----------------------------------------------------------------------- */
  var pt = $(".page-transition");
  var panels = pt ? $$(".page-transition__panel", pt) : [];
  var leaving = false;

  function pageEnter() {
    return new Promise(function (resolve) {
      if (!pt || !html.classList.contains("pt-in")) { html.classList.remove("pt-in"); resolve(); return; }
      store.del("cds-pt");
      gsap.set(panels, { yPercent: 0 });
      html.classList.remove("pt-in");
      gsap.timeline({ onComplete: function () { gsap.set(panels, { yPercent: 100 }); } })
        .to(panels.slice().reverse(), { yPercent: -100, duration: 1, ease: "expo.inOut", stagger: 0.08 })
        .add(resolve, 0.4);
    });
  }

  function pageLeave(href) {
    if (leaving) return;
    leaving = true;
    store.set("cds-pt", "1");
    setMenu(false);
    gsap.timeline({ onComplete: function () { window.location.href = href; } })
      .fromTo(panels, { yPercent: 100 }, { yPercent: 0, duration: 0.8, ease: "expo.inOut", stagger: 0.08 })
      .fromTo($(".page-transition__mark", pt), { opacity: 0, rotate: -90 }, { opacity: 1, rotate: 0, duration: 0.5 }, 0.45);
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a || !pt) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    var raw = a.getAttribute("href") || "";
    if (!raw || raw.charAt(0) === "#" || /^(mailto|tel):/i.test(raw)) return;
    var url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname) return;
    if (!/(\.html|\/)$/.test(url.pathname)) return;
    e.preventDefault();
    pageLeave(url.href);
  });

  // Retour arrière (cache navigateur) : on remet le rideau en place
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      leaving = false;
      store.del("cds-pt");
      gsap.set(panels, { yPercent: 100 });
    }
  });

  /* -----------------------------------------------------------------------
     Intro (première visite de la session, page d'accueil)
     ----------------------------------------------------------------------- */
  function playIntro() {
    return new Promise(function (resolve) {
      var intro = $("#intro");
      if (!intro || !html.classList.contains("intro-on")) { html.classList.remove("intro-on"); resolve(); return; }
      store.set("cds-intro", "1");

      var maskPath = $(".mask-path", intro);
      var len = maskPath.getTotalLength();
      var count = $(".intro__count", intro);
      var counter = { v: 0 };
      gsap.set(maskPath, { strokeDasharray: len, strokeDashoffset: len });
      gsap.set(intro, { clipPath: "inset(0% 0% 0% 0%)" });

      gsap.timeline({ onComplete: function () { html.classList.remove("intro-on"); } })
        .to(maskPath, { strokeDashoffset: 0, duration: 1.7, ease: "power2.inOut" }, 0)
        .to(counter, {
          v: 100, duration: 1.9, ease: "power2.inOut",
          onUpdate: function () { count.textContent = String(Math.round(counter.v)).padStart(3, "0"); }
        }, 0)
        .to($("text", intro), { opacity: 1, duration: 0.7 }, 0.9)
        .fromTo($(".intro__name span", intro), { yPercent: 110 }, { yPercent: 0, duration: 1, ease: "expo.out" }, 1)
        .to(intro, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.2, ease: "expo.inOut" }, "+=0.35")
        .add(resolve, "-=0.7");
    });
  }

  /* -----------------------------------------------------------------------
     Entrée du héros
     ----------------------------------------------------------------------- */
  function heroIn() {
    var hero = $(".hero, .page-hero, .notfound");
    if (!hero) return;
    var tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    $$("[data-split]", hero).forEach(function (title, i) {
      tl.fromTo(splitWords(title), { yPercent: 115 }, { yPercent: 0, duration: 1.5, stagger: 0.06 }, i * 0.12);
    });
    tl.to($$("[data-reveal]", hero), { opacity: 1, y: 0, duration: 1.3, stagger: 0.1 }, 0.35);
    var stitch = $(".hero__stitch", hero);
    if (stitch) tl.fromTo(stitch, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 2.4, ease: "power2.inOut" }, 0.2);
    var seal = $(".seal", hero);
    if (seal) tl.fromTo(seal, { scale: 0.6, opacity: 0, rotate: -40 }, { scale: 1, opacity: 1, rotate: 0, duration: 1.6 }, 0.6);
  }

  /* -----------------------------------------------------------------------
     Animations au défilement
     ----------------------------------------------------------------------- */
  function scrollAnimations() {
    var inHero = function (el) { return !!el.closest(".hero, .page-hero, .notfound"); };

    // Apparitions simples
    $$("[data-reveal]").forEach(function (el) {
      if (inHero(el)) return;
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1.3, ease: "expo.out",
        delay: parseFloat(el.getAttribute("data-delay")) || 0,
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      });
    });

    // Titres mot à mot
    $$("[data-split]").forEach(function (el) {
      if (inHero(el)) return;
      var words = splitWords(el);
      gsap.fromTo(words, { yPercent: 115 }, {
        yPercent: 0, duration: 1.3, ease: "expo.out", stagger: 0.05,
        scrollTrigger: { trigger: el, start: "top 86%", once: true }
      });
    });

    // Manifeste : les mots s'allument au fil de la lecture
    $$(".manifesto__text").forEach(function (el) {
      gsap.to(splitWords(el, "flat"), {
        opacity: 1, ease: "none", stagger: 0.1,
        scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 42%", scrub: true }
      });
    });

    $$("[data-parallax]").forEach(function (el) {
      var amount = parseFloat(el.getAttribute("data-parallax")) || 10;
      gsap.fromTo(el, { yPercent: -amount }, {
        yPercent: amount, ease: "none",
        scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true }
      });
    });

    // Processus : la couture descend et active chaque étape
    $$(".process__steps").forEach(function (steps) {
      var fill = $(".process__line span", steps);
      if (fill) {
        gsap.fromTo(fill, { height: "0%" }, {
          height: "100%", ease: "none",
          scrollTrigger: { trigger: steps, start: "top 65%", end: "bottom 65%", scrub: true }
        });
      }
      $$(".step", steps).forEach(function (step) {
        ScrollTrigger.create({
          trigger: step, start: "top 65%",
          onEnter: function () { step.classList.add("is-active"); },
          onLeaveBack: function () { step.classList.remove("is-active"); }
        });
      });
    });

    // Prestations : défilement horizontal épinglé (ordinateur)
    var hs = $(".hscroll");
    if (hs) {
      ScrollTrigger.matchMedia({
        "(min-width: 961px)": function () {
          var track = $(".hscroll__track", hs);
          var bar = $(".hscroll__progress span", hs);
          var distance = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
          gsap.to(track, {
            x: function () { return -distance(); },
            ease: "none",
            scrollTrigger: {
              trigger: $(".hscroll__pin", hs),
              start: "top top",
              end: function () { return "+=" + distance(); },
              pin: true,
              scrub: 0.8,
              invalidateOnRefresh: true,
              onUpdate: function (self) { if (bar) gsap.set(bar, { scaleX: self.progress }); }
            }
          });
        }
      });
    }

    // Grand mot du pied de page : lettres qui montent
    $$(".footer__word").forEach(function (el) {
      var text = el.textContent;
      el.setAttribute("aria-label", text);
      el.innerHTML = "";
      var chars = text.split("").map(function (c) {
        var outer = document.createElement("span");
        outer.className = "w";
        outer.setAttribute("aria-hidden", "true");
        var inner = document.createElement("span");
        inner.className = "wi";
        inner.textContent = c === " " ? " " : c;
        outer.appendChild(inner);
        el.appendChild(outer);
        return inner;
      });
      gsap.fromTo(chars, { yPercent: 105 }, {
        yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.03,
        scrollTrigger: { trigger: el, start: "top 95%", once: true }
      });
    });

    // Comparateurs avant / après : petit balayage d'invitation à leur apparition
    $$(".ba").forEach(function (box) {
      var range = $(".ba__range", box);
      var state = { v: 50 };
      ScrollTrigger.create({
        trigger: box,
        start: "top 70%",
        once: true,
        onEnter: function () {
          gsap.timeline()
            .to(state, { v: 82, duration: 0.9, ease: "power2.inOut" })
            .to(state, { v: 18, duration: 1.1, ease: "power2.inOut" })
            .to(state, { v: 50, duration: 0.9, ease: "power2.inOut" })
            .eventCallback("onUpdate", function () {
              if (box.classList.contains("is-touched")) return;
              range.value = state.v;
              box.style.setProperty("--pos", state.v + "%");
            });
        }
      });
    });

    // Anneaux du bloc final
    $$(".cta__ring").forEach(function (ring, i) {
      gsap.fromTo(ring, { rotate: 0, scale: 0.85 }, {
        rotate: i ? -40 : 40, scale: 1, ease: "none",
        scrollTrigger: { trigger: ring.parentElement, start: "top bottom", end: "bottom top", scrub: true }
      });
    });
  }

  /* -----------------------------------------------------------------------
     Curseur personnalisé, boutons magnétiques, lampe du héros
     ----------------------------------------------------------------------- */
  function pointerEffects() {
    if (!finePointer) return;

    var cursor = $(".cursor");
    if (cursor) {
      html.classList.add("has-cursor");
      cursor.classList.add("is-hidden");
      var dot = $(".cursor__dot", cursor);
      var ring = $(".cursor__ring", cursor);
      var label = $(".cursor__label", cursor);
      var dx = gsap.quickTo(dot, "x", { duration: 0.08 });
      var dy = gsap.quickTo(dot, "y", { duration: 0.08 });
      var rx = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3" });
      var ry = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3" });

      window.addEventListener("pointermove", function (e) {
        dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
        cursor.classList.remove("is-hidden");
      }, { passive: true });
      document.documentElement.addEventListener("mouseleave", function () { cursor.classList.add("is-hidden"); });

      document.addEventListener("pointerover", function (e) {
        var t = e.target.closest("[data-cursor], a, button, label, select, input[type=checkbox]");
        var field = e.target.closest("input:not([type=checkbox]):not([type=range]), textarea");
        cursor.classList.toggle("is-hidden", !!field);
        if (!t) { cursor.classList.remove("is-hover", "is-label"); return; }
        var text = t.getAttribute("data-cursor");
        if (text) {
          label.textContent = text;
          cursor.classList.add("is-label");
          cursor.classList.remove("is-hover");
        } else {
          cursor.classList.add("is-hover");
          cursor.classList.remove("is-label");
        }
      });
    }

    $$("[data-magnetic]").forEach(function (el) {
      var mx = gsap.quickTo(el, "x", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
      var my = gsap.quickTo(el, "y", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.3);
        my((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener("pointerleave", function () { mx(0); my(0); });
    });

    var lampHost = $(".hero, .page-hero, .notfound");
    var lamp = lampHost && $(".hero__lamp", lampHost);
    if (lamp) {
      lampHost.addEventListener("pointermove", function (e) {
        var r = lampHost.getBoundingClientRect();
        lamp.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        lamp.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
      });
    }
  }

  /* -----------------------------------------------------------------------
     Lancement
     ----------------------------------------------------------------------- */
  pointerEffects();
  scrollAnimations();

  var opening = html.classList.contains("intro-on") ? playIntro() : pageEnter();
  opening.then(heroIn);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
