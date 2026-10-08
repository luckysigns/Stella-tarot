/* Stellar · Copyright (c) 2026 Lucky Media LLC. All rights reserved. Proprietary. */
/* ============================================================
   The terms agreement pop-up, shared by Stellar, Stellar Tarot and Stellar BaZi.
   The SAME file is copied into each app (Stellar js/terms-gate.js, Tarot and BaZi
   terms-gate.js); change it here and copy it across.

   TERMS_VERSION lives in one place: landing/legal/published.json in the Stellar repo,
   which the landing build publishes as /terms-version.json on stellarastro.app. Every
   app reads that file. FALLBACK_VERSION below is used only when the file can't be
   fetched (offline, or a preview built before the pages went live); keep it equal.

   After any sign-in, check(user) looks for a terms_acceptances row for this user and
   the current version. With none, it shows a pop-up that clicking outside or Escape
   can't dismiss: agree (inserts the row) or sign out (leaves their data alone).
   requireAgreement() is the same check for checkout: it resolves true once agreed,
   false if they signed out.

   If the terms_acceptances table hasn't been created yet, the agreement is kept on
   this device so nobody is stuck, and written to the table once it exists.
   ============================================================ */
(function(){
  var FALLBACK_VERSION = "2026-10-08";
  var SITE = "https://www.stellarastro.app";
  var LS = "stellar.terms";            // { "<user id>": "<version agreed>" }, this device only
  var cfg = { sb: null, user: null, app: "stellar", legalBase: SITE, versionUrl: SITE + "/terms-version.json", signOut: null };
  var _version = null, _open = null, _checking = null;

  function client(){ return typeof cfg.sb === "function" ? cfg.sb() : cfg.sb; }
  function readLocal(){ try { return JSON.parse(localStorage.getItem(LS) || "{}") || {}; } catch (e) { return {}; } }
  function writeLocal(uid, v){ try { var o = readLocal(); o[uid] = v; localStorage.setItem(LS, JSON.stringify(o)); } catch (e) {} }
  function missingTable(err){
    var m = (err && err.message) || "";
    return !!err && (err.code === "42P01" || err.code === "PGRST205" || (/terms_acceptances/.test(m) && /not find|does not exist|schema cache/.test(m)));
  }

  function version(){
    if (_version) return Promise.resolve(_version);
    return fetch(cfg.versionUrl, { cache: "no-cache" })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(j){ _version = (j && /^\d{4}-\d{2}-\d{2}$/.test(j.version || "")) ? j.version : FALLBACK_VERSION; return _version; })
      .catch(function(){ _version = FALLBACK_VERSION; return _version; });
  }

  /* true = agreed to this version; false = not yet (updated: agreed to an earlier one);
     null = couldn't tell (network), so sign-in carries on and checkout asks anyway */
  function status(uid, v){
    var loc = readLocal()[uid];
    var sb = client();
    if (!sb) return Promise.resolve({ ok: loc === v ? true : null, updated: false });
    return sb.from("terms_acceptances").select("version").eq("user_id", uid).then(function(r){
      if (r.error) {
        if (missingTable(r.error)) return { ok: loc === v, updated: !!loc && loc !== v, local: true };
        return { ok: loc === v ? true : null, updated: false };
      }
      var rows = r.data || [];
      var has = rows.some(function(x){ return x.version === v; });
      if (has) { writeLocal(uid, v); return { ok: true, updated: false }; }
      // agreed on this device while the table was missing: record it now
      if (loc === v) return record(uid, v).then(function(){ return { ok: true, updated: false }; }, function(){ return { ok: true, updated: false }; });
      return { ok: false, updated: rows.length > 0 || (!!loc && loc !== v) };
    }, function(){ return { ok: loc === v ? true : null, updated: false }; });
  }

  function record(uid, v){
    var sb = client();
    if (!sb) return Promise.reject(new Error("no client"));
    return sb.from("terms_acceptances").insert({ user_id: uid, version: v, app: cfg.app }).then(function(r){
      if (r.error && !missingTable(r.error)) throw r.error;
      writeLocal(uid, v);
    });
  }

  var CSS = ".stg-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(5,8,18,.78);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}"
    + ".stg-card{width:100%;max-width:440px;max-height:calc(100vh - 32px);overflow:auto;box-sizing:border-box;background:#121a33;color:#e9edf6;border:1px solid rgba(232,201,122,.45);border-radius:18px;padding:26px 24px 20px;font-family:\"Iowan Old Style\",\"Palatino Linotype\",Palatino,Georgia,serif;box-shadow:0 20px 60px rgba(0,0,0,.5)}"
    + ".stg-card h2{margin:0 0 10px;font-size:26px;font-weight:400;color:#f4ecd8}"
    + ".stg-upd{margin:0 0 10px;color:#e8c97a;font-size:14px}"
    + ".stg-card p{margin:0 0 14px;font-size:15.5px;line-height:1.55;color:#c9d4f5}"
    + ".stg-links{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-wrap:wrap;gap:8px 16px}"
    + ".stg-links a{color:#e8c97a;font-size:15px}"
    + ".stg-check{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.45;color:#e9edf6;cursor:pointer;margin:0 0 14px}"
    + ".stg-check input{width:20px;height:20px;margin:1px 0 0;flex:none;accent-color:#e8c97a}"
    + ".stg-msg{min-height:18px;font-size:13.5px;color:#f0a8a0;margin:0 0 8px}"
    + ".stg-go,.stg-out{display:block;width:100%;box-sizing:border-box;border-radius:999px;font:inherit;font-size:16px;cursor:pointer;padding:13px 18px}"
    + ".stg-go{background:#e8c97a;color:#1a1206;border:1px solid #e8c97a}"
    + ".stg-go:disabled{opacity:.45;cursor:not-allowed}"
    + ".stg-out{margin-top:10px;background:transparent;color:#c9d4f5;border:1px solid rgba(201,212,245,.3)}";

  function show(uid, v, updated){
    if (_open) return _open;
    _open = new Promise(function(resolve){
      if (!document.getElementById("stg-css")) { var st = document.createElement("style"); st.id = "stg-css"; st.textContent = CSS; document.head.appendChild(st); }
      var b = cfg.legalBase;
      var ov = document.createElement("div");
      ov.className = "stg-ov";
      ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "stg-title");
      ov.innerHTML = '<div class="stg-card">'
        + (updated ? '<p class="stg-upd">We’ve updated our terms.</p>' : '')
        + '<h2 id="stg-title">Our terms</h2>'
        + '<p>Before you carry on, please read and agree to our Terms of Use, Privacy Policy and Cookie Policy. They explain what Stellar is, how plans and refunds work, how we handle your data, and, for US users, how disputes are settled.</p>'
        + '<ul class="stg-links"><li><a href="' + b + '/terms" target="_blank" rel="noopener">Terms of Use</a></li><li><a href="' + b + '/privacy" target="_blank" rel="noopener">Privacy Policy</a></li><li><a href="' + b + '/cookies" target="_blank" rel="noopener">Cookie Policy</a></li></ul>'
        + '<label class="stg-check"><input type="checkbox" id="stg-ok"><span>I have read and agree to the Terms of Use and Privacy Policy</span></label>'
        + '<div class="stg-msg" id="stg-msg" role="status"></div>'
        + '<button type="button" class="stg-go" id="stg-go" disabled>Agree and continue</button>'
        + '<button type="button" class="stg-out" id="stg-out">Sign out</button>'
        + '</div>';
      document.body.appendChild(ov);
      var ok = ov.querySelector("#stg-ok"), go = ov.querySelector("#stg-go"), out = ov.querySelector("#stg-out"), msg = ov.querySelector("#stg-msg");
      function close(val){ document.removeEventListener("keydown", onKey, true); ov.remove(); _open = null; resolve(val); }
      function onKey(e){
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); }
        if (e.key === "Tab") {           // keep focus inside the pop-up
          var f = [].slice.call(ov.querySelectorAll("a,input,button:not([disabled])"));
          if (!f.length) return;
          var i = f.indexOf(document.activeElement);
          if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        }
      }
      document.addEventListener("keydown", onKey, true);
      ok.addEventListener("change", function(){ go.disabled = !ok.checked; msg.textContent = ""; });
      go.addEventListener("click", function(){
        if (!ok.checked) return;
        go.disabled = true; go.textContent = "Saving…";
        record(uid, v).then(function(){ close(true); }, function(){
          go.disabled = false; go.textContent = "Agree and continue";
          msg.textContent = "That didn't save. Check your connection and try again.";
        });
      });
      out.addEventListener("click", function(){
        out.disabled = true;
        Promise.resolve(cfg.signOut ? cfg.signOut() : null).catch(function(){}).then(function(){ close(false); });
      });
      setTimeout(function(){ ok.focus(); }, 30);
    });
    return _open;
  }

  function currentUser(){
    var sb = client();
    if (!sb) return Promise.resolve(null);
    return sb.auth.getSession().then(function(r){ return r && r.data && r.data.session ? r.data.session.user : null; }, function(){ return null; });
  }

  var api = {
    init: function(o){ for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) cfg[k] = o[k]; return api; },
    version: version,
    /* after sign-in: show the pop-up if this user hasn't agreed to the current version */
    check: function(user){
      if (!user || !user.id) return Promise.resolve(true);
      if (_checking) return _checking;
      _checking = version().then(function(v){
        return status(user.id, v).then(function(s){
          if (s.ok !== false) return true;
          return show(user.id, v, s.updated);
        });
      }).then(function(r){ _checking = null; return r; }, function(){ _checking = null; return true; });
      return _checking;
    },
    /* before checkout: true once agreed (asks if unsure), false if they signed out */
    requireAgreement: function(){
      return currentUser().then(function(user){
        if (!user) return true;            // signed-out checkout paths sign in first
        return version().then(function(v){
          return status(user.id, v).then(function(s){ return s.ok === true ? true : show(user.id, v, s.updated); });
        });
      });
    },
    /* for a click that must open Stripe in the same gesture (a new tab): returns false when
       already agreed, so the caller carries on; otherwise asks, runs go() once agreed and
       returns true. cfg.user() gives the signed-in user, or null. */
    guard: function(go){
      var u = cfg.user ? cfg.user() : null;
      if (!u || !u.id) return false;
      if (_version && readLocal()[u.id] === _version) return false;
      api.requireAgreement().then(function(ok){ if (ok) go(); });
      return true;
    },
    /* the line under every sign-in email field */
    agreeLineHTML: function(){
      var b = cfg.legalBase;
      return 'By continuing you agree to our <a href="' + b + '/terms" target="_blank" rel="noopener">Terms</a> and <a href="' + b + '/privacy" target="_blank" rel="noopener">Privacy Policy</a>.';
    },
    /* "Terms · Privacy · Cookies" for settings and about screens */
    footerLinksHTML: function(){
      var b = cfg.legalBase;
      return '<a href="' + b + '/terms" target="_blank" rel="noopener">Terms</a> · <a href="' + b + '/privacy" target="_blank" rel="noopener">Privacy</a> · <a href="' + b + '/cookies" target="_blank" rel="noopener">Cookies</a>';
    }
  };
  window.StellarTerms = api;
})();
