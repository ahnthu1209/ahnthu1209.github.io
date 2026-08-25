/**
 * Renders dynamic sections (arrays + lists) from the i18n dictionary,
 * and re-renders them whenever the language changes.
 *
 * Must be loaded after i18n.js so it can listen for `langchange`.
 */
(function () {
  'use strict';

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getDict() {
    var i = window.PAT_I18N;
    if (!i) return null;
    var lang = i.get();
    return (window.PAT_I18N_DICT && window.PAT_I18N_DICT[lang]) || null;
  }

  function el(html) {
    var div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstChild;
  }

  /* ---------- hero marquee ---------- */
  function renderMarquee() {
    var d = getDict(); if (!d) return;
    var items = d.hero.marquee || [];
    var track = document.getElementById('hero-marquee');
    if (!track) return;
    var html = '<div class="hero-marquee-track">';
    for (var i = 0; i < items.length; i++) {
      html += '<span>' + escapeHtml(items[i]) + '</span>';
    }
    // duplicate for seamless loop
    for (var j = 0; j < items.length; j++) {
      html += '<span>' + escapeHtml(items[j]) + '</span>';
    }
    html += '</div>';
    track.innerHTML = html;
  }

  /* ---------- skills grid ---------- */
  function renderSkills() {
    var d = getDict(); if (!d) return;
    var grid = document.getElementById('skills-grid');
    if (!grid) return;
    var items = d.skills.items || [];
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var n = String(i + 1).padStart(2, '0');
      html += '<div class="skill-card reveal">';
      html += '<div class="skill-icon">' + n + '</div>';
      html += '<div class="skill-name">' + escapeHtml(items[i].name) + '</div>';
      html += '<p class="skill-desc">' + escapeHtml(items[i].desc) + '</p>';
      html += '</div>';
    }
    grid.innerHTML = html;
    reObserveReveals();
  }

  /* ---------- experience timeline ---------- */
  function renderExperience() {
    var d = getDict(); if (!d) return;
    var t = document.getElementById('experience-timeline');
    if (!t) return;
    var jobs = d.experience.jobs || [];
    var html = '';
    for (var i = 0; i < jobs.length; i++) {
      var job = jobs[i];
      var current = (i === 0) ? ' current' : '';
      html += '<div class="timeline-item' + current + ' reveal">';
      html += '<div class="timeline-dot"></div>';
      html += '<div class="exp-card">';
      html += '<div class="exp-header">';
      html += '<div>';
      html += '<div class="exp-role">' + escapeHtml(job.role) + '</div>';
      html += '<div class="exp-company">' + escapeHtml(job.company) + '</div>';
      html += '</div>';
      html += '<div class="exp-date">' + escapeHtml(job.date) + '</div>';
      html += '</div>';
      html += '<ul class="exp-list">';
      var bullets = job.bullets || [];
      for (var b = 0; b < bullets.length; b++) {
        html += '<li>' + escapeHtml(bullets[b]) + '</li>';
      }
      html += '</ul>';
      html += '</div>';
      html += '</div>';
    }
    t.innerHTML = html;
    reObserveReveals();
  }

  /* ---------- process (5-step) ---------- */
  function renderProcess() {
    var d = getDict(); if (!d) return;
    var grid = document.getElementById('process-grid');
    if (!grid) return;
    var steps = d.planning.steps || [];
    var html = '';
    for (var i = 0; i < steps.length; i++) {
      var n = String(i + 1).padStart(2, '0');
      html += '<div class="process-step reveal">';
      html += '<div class="step-number">' + n + '</div>';
      html += '<div class="step-title">' + escapeHtml(steps[i].title) + '</div>';
      html += '<p class="step-desc">' + escapeHtml(steps[i].desc) + '</p>';
      html += '</div>';
    }
    grid.innerHTML = html;
    reObserveReveals();
  }

  /* ---------- concept tabs ---------- */
  function renderConceptTabs() {
    var d = getDict(); if (!d) return;
    var tabs = document.getElementById('concept-tabs');
    if (!tabs) return;
    var items = d.planning.conceptTabs || [];
    // keys map to data-target attribute values
    var keys = ['andora-city', 'anmaison', 'gold-coast-vung-tau', 'parc-ville', 'the-poet-residences', 'tan-phu-hung'];
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var active = (i === 0) ? ' active' : '';
      var key = keys[i] || ('tab-' + i);
      html += '<button class="concept-tab' + active + '" data-target="' + key + '" type="button">' + escapeHtml(items[i]) + '</button>';
    }
    tabs.innerHTML = html;
    // Re-wire listeners because innerHTML replaced the buttons
    wireConceptTabs();
  }

  function wireConceptTabs() {
    var groups = document.querySelectorAll('.concept-tabs');
    groups.forEach(function (tabGroup) {
      var tabBtns = tabGroup.querySelectorAll('.concept-tab');
      var gallery = tabGroup.nextElementSibling;
      if (!gallery) return;
      tabBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          tabBtns.forEach(function (t) { t.classList.remove('active'); });
          btn.classList.add('active');
          var target = btn.getAttribute('data-target');
          gallery.querySelectorAll('.concept-pane').forEach(function (pane) {
            pane.style.display = (pane.getAttribute('data-pane') === target) ? 'grid' : 'none';
          });
        });
      });
    });
  }

  /* ---------- sales docs (drive cards) ---------- */
  function renderSalesDocs() {
    var d = getDict(); if (!d) return;
    var grid = document.getElementById('sales-drive-grid');
    if (!grid) return;
    var docs = d.planning.subsections.salesDoc.docs || [];
    var urls = [
      'https://drive.google.com/file/d/1aYkYR0K2zHiB0_woDP9O9VTaRi0PT0OM/view?usp=sharing',
      'https://drive.google.com/file/d/1Tptjav8d-zVuIv_7IY6CrpqLlufAtxMw/view?usp=sharing'
    ];
    var html = '';
    for (var i = 0; i < docs.length; i++) {
      var url = urls[i] || '#';
      html += '<div class="drive-card">';
      html += '<div class="drive-card-icon">PDF</div>';
      html += '<div class="drive-card-title">' + escapeHtml(docs[i].title) + '</div>';
      html += '<p class="drive-card-desc">' + escapeHtml(docs[i].desc) + '</p>';
      html += '<a href="' + url + '" target="_blank" rel="noopener" class="drive-card-cta">' + escapeHtml(docs[i].cta) + '</a>';
      html += '</div>';
    }
    grid.innerHTML = html;
  }

  /* ---------- videos ---------- */
  function renderVideos() {
    var d = getDict(); if (!d) return;
    var grid = document.getElementById('videos-grid');
    if (!grid) return;
    var items = d.planning.subsections.videos.items || [];
    var ids = [
      '1pF_q_qRdENtuhFdYoHZsUTrnsAuXRrSg',
      '1HOVDaMsl74iAPpaHqTt7R-3Y5AKL9aTc',
      '1U7Bs3ODJvJfpKDiSwBB4_oIqjaN7nuMZ',
      '1LaR1_T5ZYpOY1oXmZkfyzB4jtroPEeqJ',
      '135oFdV69niRwenDvTaZYMANEh9KNnUpG'
    ];
    var cta = d.planning.subsections.videos.cta || '';
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var id = ids[i] || '';
      var url = id ? ('https://drive.google.com/file/d/' + id + '/view?usp=sharing') : '#';
      html += '<div class="video-card">';
      if (id) {
        html += '<iframe src="https://drive.google.com/file/d/' + id + '/preview" allow="autoplay" loading="lazy" title="' + escapeHtml(items[i].title) + '"></iframe>';
      }
      html += '<div class="video-card-meta">';
      html += '<div class="video-card-title">' + escapeHtml(items[i].title) + '</div>';
      html += '<a href="' + url + '" target="_blank" rel="noopener" class="video-card-cta">' + escapeHtml(cta) + '</a>';
      html += '</div>';
      html += '</div>';
    }
    grid.innerHTML = html;
  }

  /* ---------- event highlights ---------- */
  function renderEventHighlights() {
    var d = getDict(); if (!d) return;
    var wrap = document.getElementById('event-highlight');
    if (!wrap) return;
    var items = d.planning.subsections.event.highlights || [];
    var html = '';
    for (var i = 0; i < items.length; i++) {
      html += '<div class="event-highlight-item">';
      html += '<h4>' + escapeHtml(items[i].title) + '</h4>';
      html += '<p>' + escapeHtml(items[i].desc) + '</p>';
      html += '</div>';
    }
    wrap.innerHTML = html;
  }

  /* ---------- projects ---------- */
  function renderProjects() {
    var d = getDict(); if (!d) return;
    var grid = document.getElementById('projects-grid');
    if (!grid) return;
    var items = d.projects.items || [];
    var slugs = [
      'gold-coast-cinema',
      'gold-coast-times-square',
      'gold-coast-training',
      'gold-coast-roadshow',
      'gold-coast-ooh',
      'park-lane',
      'ramond-urbaniz',
      'seaview-tower',
      'hoi-an-legacy',
      'event-activation',
      'pho-hoi-activation'
    ];
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var slug = slugs[i] || '';
      var path = slug ? ('projects/' + slug + '.png') : '';
      html += '<a href="' + path + '" data-lightbox class="project-card reveal">';
      html += '<img src="' + path + '" alt="' + escapeHtml(items[i].name) + '" loading="lazy"/>';
      html += '<div class="project-overlay">';
      html += '<div class="project-name">' + escapeHtml(items[i].name) + '</div>';
      html += '<div class="project-tag">' + escapeHtml(items[i].tag) + '</div>';
      html += '</div>';
      html += '</a>';
    }
    grid.innerHTML = html;
    reObserveReveals();
    wireLightbox();
  }

  /* ---------- reveal observer re-binding ---------- */
  function reObserveReveals() {
    if (!window.PAT_REVEAL_OBSERVER) return;
    var newEls = document.querySelectorAll('.reveal:not(.visible)');
    newEls.forEach(function (el) { window.PAT_REVEAL_OBSERVER.observe(el); });
  }

  /* ---------- lightbox re-binding ---------- */
  function wireLightbox() {
    if (!window.PAT_LIGHTBOX_OPEN) return;
    document.querySelectorAll('[data-lightbox]').forEach(function (item) {
      // avoid double-binding
      if (item.__patBound) return;
      item.__patBound = true;
      item.addEventListener('click', function (e) {
        e.preventDefault();
        var src = item.getAttribute('data-lightbox') || item.getAttribute('href');
        if (!src) return;
        window.PAT_LIGHTBOX_OPEN(src);
      });
    });
  }

  /* ---------- bootstrap ---------- */
  function renderAll() {
    renderMarquee();
    renderSkills();
    renderExperience();
    renderProcess();
    renderConceptTabs();
    renderSalesDocs();
    renderVideos();
    renderEventHighlights();
    renderProjects();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // Wait one tick so i18n.js initial apply finishes
      setTimeout(renderAll, 0);
    });
  } else {
    setTimeout(renderAll, 0);
  }

  // Re-render on language change
  document.addEventListener('langchange', function () {
    renderAll();
  });
})();
