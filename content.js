(function () {
  'use strict';

  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  const TS_COLORS = {
    get primary()          { return getCSSVar('--ts-primary') || '#5E9CE6'; },
    get primaryHighlight() { return getCSSVar('--ts-primary-highlight') || 'rgba(94, 156, 230, 0.4)'; },
  };

  const RESUME_DATA = (typeof __TS_RESUME_DATA !== 'undefined') ? __TS_RESUME_DATA : [];

  class JobAssistant {
    constructor() {
      this.sidebar = null;
      this.toggleBtn = null;
      this.isVisible = false;
      this.currentInput = null;
      this.inputs = [];
      this.hideContent = false;
      this.init();
    }

    init() {
      this.createToggleButton();
      this.createSidebar();
      this.bindGlobalEvents();
    }

    // ── UI 创建 ──

    createToggleButton() {
      const el = document.getElementById('ts-toggle');
      if (el) el.remove();

      this.toggleBtn = document.createElement('button');
      this.toggleBtn.id = 'ts-toggle';
      this.toggleBtn.className = 'ts-toggle';
      this.toggleBtn.textContent = '烫水-网申秋招工具';
      this.toggleBtn.title = '打开/关闭求职助手';
      document.body.appendChild(this.toggleBtn);

      this.toggleBtn.addEventListener('click', (e) => {
        if (this._dragged) return;
        e.stopPropagation();
        this.toggle();
      });

      this.enableDrag();
    }

    enableDrag() {
      let startX, startY, startL, startT;
      this._dragged = false;

      const onMove = (e) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!this._dragged && Math.sqrt(dx * dx + dy * dy) > 5) this._dragged = true;
        if (this._dragged) {
          const maxL = window.innerWidth - this.toggleBtn.offsetWidth;
          const maxT = window.innerHeight - this.toggleBtn.offsetHeight;
          this.toggleBtn.style.left = Math.max(0, Math.min(startL + dx, maxL)) + 'px';
          this.toggleBtn.style.top = Math.max(0, Math.min(startT + dy, maxT)) + 'px';
          this.toggleBtn.style.right = 'auto';
        }
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      this.toggleBtn.addEventListener('mousedown', (e) => {
        this._dragged = false;
        startX = e.clientX;
        startY = e.clientY;
        const r = this.toggleBtn.getBoundingClientRect();
        startL = r.left;
        startT = r.top;
        e.preventDefault();
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }

    createSidebar() {
      const el = document.getElementById('ts-sidebar');
      if (el) el.remove();

      this.sidebar = document.createElement('div');
      this.sidebar.id = 'ts-sidebar';
      this.sidebar.className = 'ts-sidebar';
      this.sidebar.innerHTML = this.buildHTML();
      document.body.appendChild(this.sidebar);
      this.bindSidebarEvents();
    }

    buildHTML() {
      const groupsHTML = RESUME_DATA.map(
        (g) => `
        <div class="ts-group">
          <div class="ts-group-head" data-collapsed="false">
            <span class="ts-group-name">${esc(g.group)}</span>
            <span class="ts-group-count">${g.items.length}</span>
            <span class="ts-arrow">&#9662;</span>
          </div>
          <div class="ts-group-body">
            ${g.items
              .map(
                (item) => `
              <div class="ts-item">
                <button class="ts-fill" data-value="${esc(item.value)}" title="${esc(item.value)}">
                  ${esc(item.label)}
                </button>
                <span class="ts-preview">${esc(truncate(item.value, 20))}</span>
              </div>`
              )
              .join('')}
          </div>
        </div>`
      ).join('');

      return `
        <div class="ts-container">
          <div class="ts-header">
            <span class="ts-title">烫水-网申秋招工具</span>
            <div class="ts-header-actions">
              <button class="ts-next" id="ts-next" title="跳转下一个输入框">下一个</button>
              <label class="ts-privacy" title="隐藏/显示填写内容">
                <input type="checkbox" id="ts-privacy" ${this.hideContent ? '' : 'checked'}>
                <span>${this.hideContent ? '已隐藏' : '显示'}</span>
              </label>
              <button class="ts-close" id="ts-close" title="收起">&times;</button>
            </div>
          </div>
          <div class="ts-search-wrap">
            <input type="text" id="ts-search" class="ts-search" placeholder="搜索字段...">
          </div>
          <div class="ts-body ${this.hideContent ? 'ts-hidden-content' : ''}" id="ts-body">
            ${groupsHTML}
          </div>
          <div class="ts-footer">
            <span class="ts-msg" id="ts-msg"></span>
            <span class="ts-hint">先点网页输入框，再点按钮填写</span>
          </div>
        </div>`;
    }

    // ── 事件绑定 ──

    bindSidebarEvents() {
      this.sidebar.querySelector('#ts-close').addEventListener('click', () => this.hide());

      this.sidebar.querySelector('#ts-next').addEventListener('click', () => this.jumpNext());

      this.sidebar.querySelector('#ts-privacy').addEventListener('change', (e) => {
        this.hideContent = !e.target.checked;
        const body = this.sidebar.querySelector('#ts-body');
        const label = e.target.parentElement.querySelector('span');
        if (this.hideContent) {
          body.classList.add('ts-hidden-content');
          label.textContent = '已隐藏';
        } else {
          body.classList.remove('ts-hidden-content');
          label.textContent = '显示';
        }
      });

      this.sidebar.querySelector('#ts-search').addEventListener('input', (e) => {
        this.filterItems(e.target.value.trim().toLowerCase());
      });

      this.sidebar.querySelectorAll('.ts-group-head').forEach((head) => {
        head.addEventListener('click', () => {
          const body = head.nextElementSibling;
          const collapsed = head.getAttribute('data-collapsed') === 'true';
          head.setAttribute('data-collapsed', String(!collapsed));
          body.style.display = collapsed ? '' : 'none';
        });
      });

      this.sidebar.querySelectorAll('.ts-fill').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const value = e.currentTarget.getAttribute('data-value');
          this.fillCurrent(value);
        });
      });
    }

    bindGlobalEvents() {
      document.addEventListener('focusin', (e) => {
        const t = e.target;
        if (
          t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable
        ) {
          if (!this.sidebar.contains(t)) {
            this.currentInput = t;
          }
        }
      });

      chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
        if (req.action === 'toggleSidebar') {
          this.toggle();
          sendResponse({ ok: true });
        }
        return true;
      });
    }

    // ── 侧边栏控制 ──

    toggle() {
      this.isVisible ? this.hide() : this.show();
    }

    show() {
      this.sidebar.classList.add('ts-visible');
      this.isVisible = true;
      this.toggleBtn.classList.add('ts-open');
    }

    hide() {
      this.sidebar.classList.remove('ts-visible');
      this.isVisible = false;
      this.toggleBtn.classList.remove('ts-open');
    }

    // ── 搜索 ──

    filterItems(keyword) {
      this.sidebar.querySelectorAll('.ts-group').forEach((group) => {
        let anyVisible = false;
        group.querySelectorAll('.ts-item').forEach((item) => {
          const btn = item.querySelector('.ts-fill');
          const label = btn.textContent.toLowerCase();
          const value = btn.getAttribute('data-value').toLowerCase();
          const match = !keyword || label.includes(keyword) || value.includes(keyword);
          item.style.display = match ? '' : 'none';
          if (match) anyVisible = true;
        });
        group.style.display = anyVisible ? '' : 'none';
        if (anyVisible) {
          group.querySelector('.ts-group-head').setAttribute('data-collapsed', 'false');
          group.querySelector('.ts-group-body').style.display = '';
        }
      });
    }

    // ── 跳转下一个输入框 ──

    jumpNext() {
      this.scanInputs();
      if (this.inputs.length === 0) {
        this.msg('未找到可填写的输入框', 'warn');
        return;
      }

      let idx = 0;
      if (this.currentInput) {
        const ci = this.inputs.indexOf(this.currentInput);
        if (ci !== -1) idx = (ci + 1) % this.inputs.length;
      }

      const next = this.inputs[idx];
      next.focus();
      this.currentInput = next;
      next.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const orig = next.style.boxShadow;
      next.style.boxShadow = `0 0 0 3px ${TS_COLORS.primaryHighlight}`;
      setTimeout(() => (next.style.boxShadow = orig), 2000);

      this.msg(`第 ${idx + 1}/${this.inputs.length} 个`, 'ok');
    }

    scanInputs() {
      const inputs = Array.from(
        document.querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"])'
        )
      );
      const textareas = Array.from(document.querySelectorAll('textarea'));
      const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));

      this.inputs = [...inputs, ...textareas, ...editables].filter((el) => {
        if (this.sidebar.contains(el)) return false;
        const r = el.getBoundingClientRect();
        const s = window.getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          s.visibility !== 'hidden' &&
          s.display !== 'none' &&
          !el.disabled &&
          !el.readOnly
        );
      }).sort((a, b) => {
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        return Math.abs(ra.top - rb.top) < 10
          ? ra.left - rb.left
          : ra.top - rb.top;
      });
    }

    // ── 填充逻辑 ──

    fillCurrent(content) {
      if (!this.currentInput) {
        this.msg('请先点击网页上的输入框', 'warn');
        return;
      }

      try {
        this.doFill(this.currentInput, content);
        this.msg('已填写', 'ok');
        this.flashBorder(this.currentInput, TS_COLORS.primary);
      } catch (err) {
        console.error('[烫水-网申秋招工具] 填写失败:', err);
        this.fallbackFill(this.currentInput, content);
      }
    }

    doFill(el, content) {
      el.focus();
      this.simulateClick(el);
      this.clearContent(el);
      this.setContent(el, content);
      this.fireEventSequence(el);

      setTimeout(() => {
        el.blur();
        fire(el, 'blur');
        fire(el, 'focusout');
        setTimeout(() => {
          el.focus();
          fire(el, 'focus');
          fire(el, 'focusin');
          setTimeout(() => {
            fire(el, 'input');
            fire(el, 'change');
          }, 50);
        }, 100);
      }, 100);
    }

    simulateClick(el) {
      for (const type of ['mousedown', 'mouseup', 'click']) {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      }
    }

    clearContent(el) {
      if (el.isContentEditable) {
        el.textContent = '';
        el.innerHTML = '';
      } else {
        el.value = '';
      }
      fire(el, 'input');
      fire(el, 'change');
    }

    setContent(el, content) {
      if (el.isContentEditable) {
        el.textContent = content;
      } else {
        try {
          const setter = Object.getOwnPropertyDescriptor(
            el.constructor.prototype,
            'value'
          ).set;
          setter.call(el, content);
        } catch (_) {
          el.value = content;
        }
      }

      try {
        el.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: content,
          })
        );
      } catch (_) {
        fire(el, 'input');
      }
    }

    fireEventSequence(el) {
      fire(el, 'compositionstart');

      for (const t of ['keydown', 'keypress', 'keyup']) {
        el.dispatchEvent(
          new KeyboardEvent(t, {
            bubbles: true,
            cancelable: true,
            key: 'a',
            keyCode: 65,
            which: 65,
            view: window,
          })
        );
      }

      fire(el, 'compositionend');
      fire(el, 'change');

      const v = el.isContentEditable ? el.textContent : el.value;
      el.dispatchEvent(
        new CustomEvent('ngModelChange', { bubbles: true, cancelable: true, detail: v })
      );
    }

    fallbackFill(el, content) {
      try {
        el.focus();
        if (el.isContentEditable) {
          el.textContent = content;
        } else {
          el.value = content;
        }
        fire(el, 'input');
        fire(el, 'change');
        setTimeout(() => {
          el.blur();
          setTimeout(() => el.focus(), 100);
        }, 100);
        this.msg('已填写(备用)', 'ok');
        this.flashBorder(el, TS_COLORS.primary);
      } catch (err) {
        this.msg('填写失败', 'err');
        console.error('[烫水-网申秋招工具] 备用填充也失败:', err);
      }
    }

    // ── 工具方法 ──

    flashBorder(el, color) {
      const orig = el.style.border;
      el.style.border = `2px solid ${color}`;
      setTimeout(() => (el.style.border = orig), 1000);
    }

    msg(text, type) {
      const el = this.sidebar.querySelector('#ts-msg');
      if (!el) return;
      el.textContent = text;
      el.className = 'ts-msg ts-msg-' + type;
      if (type !== 'loading') {
        setTimeout(() => {
          el.textContent = '';
          el.className = 'ts-msg';
        }, 2500);
      }
    }
  }

  // ── 纯函数工具 ──

  function fire(el, type) {
    el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function truncate(str, len) {
    return str.length > len ? str.slice(0, len) + '...' : str;
  }

  // ── 启动（run_at: document_end 保证 document.body 已就绪）──

  window._jobAssistant = new JobAssistant();
})();
