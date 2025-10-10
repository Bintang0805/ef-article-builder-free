/**
 * EF Article Builder - Complete Bundle
 * Version: 1.0.0
 * Single file with dynamic premium component loading
 * License: MIT (Free version) / Commercial (Premium version)
 */

(function (global) {
    'use strict';
    let editorInstanceCounter = 0;
    const activeEditors = new Map();

    // ============================================
    // BASE COMPONENTS REGISTRY (FREE)
    // ============================================
    const BaseComponentsRegistry = {
        templates: {
            // General Components
            h2: { tag: 'h2', text: 'Judul Bagian', class: '', layout: 'column' },
            h3: { tag: 'h3', text: 'Sub Judul', class: '', layout: 'column' },
            h4: { tag: 'h4', text: 'Heading 4', class: '', layout: 'column' },
            p: { tag: 'p', text: 'Ini adalah paragraf. Klik untuk mengedit konten ini.', class: '', layout: 'column' },
            'p-large': { tag: 'p', text: 'Paragraf pembuka yang lebih besar.', class: 'text-xl', layout: 'column' },
            ol: { tag: 'ol', text: 'Item pertama\nItem kedua\nItem ketiga', class: '', layout: 'column' },
            ul: { tag: 'ul', text: 'Item pertama\nItem kedua\nItem ketiga', class: '', layout: 'column' },
            code: { tag: 'div', type: 'code-block', text: '// Contoh code\nfunction hello() {\n  console.log("Hello World");\n}', class: '', layout: 'column' },

            'image': { tag: 'div', type: 'image', text: 'https://placehold.co/800x400|Image Title|This is an image caption', class: '', layout: 'column' },
            'embed': { tag: 'div', type: 'embed', text: 'youtube|https://www.youtube.com/watch?v=jNQXAC9IVRw|Video Title (Optional)', class: '', layout: 'column' },

            // Dividers
            'divider-line': { tag: 'div', type: 'divider-line', text: '', class: '', layout: 'column' },
            'divider-dashed': { tag: 'div', type: 'divider-dashed', text: '', class: '', layout: 'column' },
            'divider-dotted': { tag: 'div', type: 'divider-dotted', text: '', class: '', layout: 'column' },
            'divider-gradient': { tag: 'div', type: 'divider-gradient', text: '', class: '', layout: 'column' },
            'divider-text': { tag: 'div', type: 'divider-text', text: '* * *', class: '', layout: 'column' }
        },

        groups: {
            'General': ['h2', 'h3', 'h4', 'p', 'p-large', 'ol', 'ul', 'code'],
            'Media': ['image', 'embed'],
            'Dividers': ['divider-line', 'divider-dashed', 'divider-dotted', 'divider-gradient', 'divider-text']
        },

        icons: {
            h2: 'heading', h3: 'heading', h4: 'heading', p: 'paragraph', 'p-large': 'text-height',
            ol: 'list-ol', ul: 'list-ul', code: 'code',
            'image': 'image',
            'embed': 'video',
            'divider-line': 'minus', 'divider-dashed': 'grip-lines', 'divider-dotted': 'ellipsis-h',
            'divider-gradient': 'stream', 'divider-text': 'asterisk'
        },

        labels: {
            h2: 'H2 Heading', h3: 'H3 Heading', h4: 'H4 Heading', p: 'Paragraph', 'p-large': 'Large Paragraph',
            ol: 'Ordered List', ul: 'Unordered List', code: 'Code Block',
            'image': 'Image Block',
            'embed': 'Embed Media',
            'divider-line': 'Solid Line', 'divider-dashed': 'Dashed Line', 'divider-dotted': 'Dotted Line',
            'divider-gradient': 'Gradient Line', 'divider-text': 'Text Divider'
        }
    };

    // ============================================
    // MAIN EDITOR CLASS
    // ============================================
    class EfArticleBuilder {
        constructor(selector, options = {}) {
            this.container = typeof selector === 'string' ? document.querySelector(selector) : selector;
            if (!this.container) throw new Error('EfArticleBuilder: Container not found');

            this.instanceId = `ef-editor-${++editorInstanceCounter}`;
            activeEditors.set(this.instanceId, this);

            this.options = {
                editorTheme: options.editorTheme || 'glassmorphism',
                contentTheme: options.contentTheme || null,
                locale: options.locale || 'id',
                displayMode: options.displayMode || 'inline',
                maxHeight: options.maxHeight || '600px',
                compactButtonText: options.compactButtonText || 'Open Editor',
                components: options.components || ['all'],
                licenseKey: options.licenseKey || null,
                apiEndpoint: 'https://api.development.test:8000/api/validate-license',
                onSave: options.onSave || null,
                onChange: options.onChange || null,
                onLicenseValidated: options.onLicenseValidated || null,
                onLicenseError: options.onLicenseError || null,
                onReady: options.onReady || null,  // ADD THIS
                initialContent: options.initialContent || null,  // ADD THIS
                ...options
            };

            this.inputName = this.container.dataset.name || null;

            this.initialDataValue = this.container.dataset.value || null;

            this.data = [];
            this.currentEditorTheme = typeof this.options.editorTheme === 'string' ? this.options.editorTheme : 'custom';
            this.currentContentTheme = this.options.contentTheme ?
                (typeof this.options.contentTheme === 'string' ? this.options.contentTheme : 'custom') :
                this.currentEditorTheme;

            this.customEditorTheme = typeof this.options.editorTheme === 'object' ? this.options.editorTheme : null;
            this.customContentTheme = this.options.contentTheme && typeof this.options.contentTheme === 'object' ? this.options.contentTheme : null;

            this.currentEditIndex = -1;
            this.livePreviewActive = false;
            this.isCompactMode = this.options.displayMode === 'compact';
            this.editorVisible = !this.isCompactMode;

            // Premium status
            this.isPremium = false;
            this.premiumLoaded = false;

            // Load base components
            this.templates = { ...BaseComponentsRegistry.templates };
            this.componentGroups = { ...BaseComponentsRegistry.groups };
            this.componentIcons = { ...BaseComponentsRegistry.icons };
            this.componentLabels = { ...BaseComponentsRegistry.labels };

            // Initialize themes
            this.initThemes();

            // Start initialization (async if license key provided)
            this.initialize();
        }

        async initialize() {
            if (this.options.licenseKey) {
                this.showLoadingState();

                try {
                    const validated = await this.validateAndLoadPremium(this.options.licenseKey);

                    if (validated) {
                        console.log('✓ EfArticleBuilder: Premium features activated');
                        if (this.options.onLicenseValidated) {
                            this.options.onLicenseValidated(this);
                        }
                    } else {
                        console.warn('⚠ EfArticleBuilder: Invalid license - using free version');
                        if (this.options.onLicenseError) {
                            this.options.onLicenseError('Invalid license key');
                        }
                    }
                } catch (error) {
                    console.error('✗ EfArticleBuilder: License validation failed', error);
                    if (this.options.onLicenseError) {
                        this.options.onLicenseError(error.message);
                    }
                } finally {
                    this.hideLoadingState();
                    this.initEditor();
                }
            } else {
                this.initEditor();
            }
        }

        async validateAndLoadPremium(licenseKey) {
            try {
                const response = await fetch(this.options.apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        licenseKey: licenseKey,
                        domain: window.location.hostname,
                        product: 'ef-article-builder',
                        version: '1.0.0'
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.valid && data.premiumScriptUrl) {
                    await this.loadPremiumScript(data.premiumScriptUrl);
                    this.isPremium = true;
                    return true;
                }

                return false;
            } catch (error) {
                throw new Error(`License validation failed: ${error.message}`);
            }
        }

        loadPremiumScript(scriptUrl) {
            return new Promise((resolve, reject) => {
                if (this.premiumLoaded) {
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = scriptUrl;
                script.async = true;

                script.onload = () => {
                    this.premiumLoaded = true;
                    resolve();
                };

                script.onerror = () => {
                    reject(new Error('Failed to load premium components script'));
                };

                document.head.appendChild(script);
            });
        }

        showLoadingState() {
            this.container.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: var(--ef-text-secondary, #666);">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid rgba(99, 102, 241, 0.2); border-top-color: #6366f1; border-radius: 50%; animation: ef-spin 1s linear infinite;"></div>
                    <p style="margin-top: 1rem; font-size: 0.875rem;">Validating license...</p>
                </div>
                <style>
                    @keyframes ef-spin { to { transform: rotate(360deg); } }
                </style>
            `;
        }

        hideLoadingState() {
            // Will be cleared by initEditor()
        }

        initEditor() {
            this.container.innerHTML = this.getEditorHTML();
            this.applyEditorTheme();
            this.attachEvents();
            this.initDragDrop();
            this.initModals();
            this.attachComponentPreviewEvents();
            this.getHiddenInput();
            this.loadInitialContent();

            if (this.options.onReady && typeof this.options.onReady === 'function') {
                // Use setTimeout to ensure DOM is fully ready
                setTimeout(() => {
                    this.options.onReady(this);
                }, 1000);
            }
        }

        // ============================================
        // THEME INITIALIZATION
        // ============================================
        initThemes() {
            this.editorThemes = {
                glassmorphism: {
                    '--ef-bg': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '--ef-card-bg': 'rgba(255, 255, 255, 0.1)',
                    '--ef-card-border': 'rgba(255, 255, 255, 0.2)',
                    '--ef-text-primary': '#f8fafc',
                    '--ef-text-secondary': 'rgba(248, 250, 252, 0.8)',
                    '--ef-code-bg': 'rgba(0, 0, 0, 0.3)',
                    '--ef-code-text': '#4ade80',
                    '--ef-tip-bg': 'rgba(255, 255, 255, 0.1)',
                    '--ef-tip-border': '#6366f1',
                    '--ef-cta-bg': 'rgba(255, 255, 255, 0.1)',
                    '--ef-cta-text': '#f8fafc',
                    '--ef-cta-btn-primary': 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    '--ef-cta-btn-secondary': 'rgba(255, 255, 255, 0.1)',
                    '--ef-table-header-bg': 'rgba(255, 255, 255, 0.1)'
                },
                'simple-modern': {
                    '--ef-bg': '#f8f9fa',
                    '--ef-card-bg': '#ffffff',
                    '--ef-card-border': '#e9ecef',
                    '--ef-text-primary': '#212529',
                    '--ef-text-secondary': '#495057',
                    '--ef-code-bg': '#f8f9fa',
                    '--ef-code-text': '#0066cc',
                    '--ef-tip-bg': '#e7f3ff',
                    '--ef-tip-border': '#0066cc',
                    '--ef-cta-bg': '#e7f3ff',
                    '--ef-cta-text': '#0a3d80',
                    '--ef-cta-btn-primary': '#0066cc',
                    '--ef-cta-btn-secondary': '#ffffff',
                    '--ef-table-header-bg': '#0066cc'
                },
                colorful: {
                    '--ef-bg': 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)',
                    '--ef-card-bg': 'rgba(255, 255, 255, 0.9)',
                    '--ef-card-border': '#fbbf24',
                    '--ef-text-primary': '#78350f',
                    '--ef-text-secondary': '#92400e',
                    '--ef-code-bg': '#1e293b',
                    '--ef-code-text': '#fbbf24',
                    '--ef-tip-bg': '#dbeafe',
                    '--ef-tip-border': '#3b82f6',
                    '--ef-cta-bg': 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    '--ef-cta-text': '#ffffff',
                    '--ef-cta-btn-primary': 'linear-gradient(135deg, #f59e0b, #f97316)',
                    '--ef-cta-btn-secondary': 'rgba(255, 255, 255, 0.5)',
                    '--ef-table-header-bg': 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                }
            };

            this.contentThemes = {
                glassmorphism: { ...this.editorThemes.glassmorphism },
                'simple-modern': {
                    '--ef-bg': '#f8f9fa',
                    '--ef-card-bg': '#ffffff',
                    '--ef-card-border': '#dee2e6',
                    '--ef-text-primary': '#212529',
                    '--ef-text-secondary': '#6c757d',
                    '--ef-code-bg': '#f8f9fa',
                    '--ef-code-text': '#d63384',
                    '--ef-tip-bg': '#cfe2ff',
                    '--ef-tip-border': '#0d6efd',
                    '--ef-cta-bg': '#e7f3ff',
                    '--ef-cta-text': '#0a3d80',
                    '--ef-cta-btn-primary': '#0d6efd',
                    '--ef-cta-btn-secondary': '#ffffff',
                    '--ef-table-header-bg': '#e7f1ff'
                },
                colorful: {
                    '--ef-bg': 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)',
                    '--ef-card-bg': 'rgba(255, 255, 255, 0.9)',
                    '--ef-card-border': '#fbbf24',
                    '--ef-text-primary': '#78350f',
                    '--ef-text-secondary': '#92400e',
                    '--ef-code-bg': '#1e293b',
                    '--ef-code-text': '#fbbf24',
                    '--ef-tip-bg': '#dbeafe',
                    '--ef-tip-border': '#3b82f6',
                    '--ef-cta-bg': 'linear-gradient(135deg, #f59e0b, #d97706)',
                    '--ef-cta-text': '#ffffff',
                    '--ef-cta-btn-primary': 'linear-gradient(135deg, #dc2626, #b91c1c)',
                    '--ef-cta-btn-secondary': '#dba213ff',
                    '--ef-table-header-bg': 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                },
                'clean-white': {
                    '--ef-bg': '#ffffff',
                    '--ef-card-bg': '#f8f9fa',
                    '--ef-card-border': '#dee2e6',
                    '--ef-text-primary': '#212529',
                    '--ef-text-secondary': '#6c757d',
                    '--ef-code-bg': '#f1f3f5',
                    '--ef-code-text': '#c92a2a',
                    '--ef-tip-bg': '#e9ecef',
                    '--ef-tip-border': '#868e96',
                    '--ef-cta-bg': '#f8f9fa',
                    '--ef-cta-text': '#212529',
                    '--ef-cta-btn-primary': '#212529',
                    '--ef-cta-btn-secondary': '#ffffff',
                    '--ef-table-header-bg': '#e9ecef'
                },
                'dark-professional': {
                    '--ef-bg': '#0f172a',
                    '--ef-card-bg': '#1e293b',
                    '--ef-card-border': '#334155',
                    '--ef-text-primary': '#f1f5f9',
                    '--ef-text-secondary': '#cbd5e1',
                    '--ef-code-bg': '#020617',
                    '--ef-code-text': '#38bdf8',
                    '--ef-tip-bg': '#1e293b',
                    '--ef-tip-border': '#3b82f6',
                    '--ef-cta-bg': '#334155',
                    '--ef-cta-text': '#f1f5f9',
                    '--ef-cta-btn-primary': 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    '--ef-cta-btn-secondary': 'rgba(255, 255, 255, 0.1)',
                    '--ef-table-header-bg': '#334155'
                }
            };
        }

        // ============================================
        // UI RENDERING METHODS
        // ============================================
        getEditorHTML() {
            if (this.options.displayMode === 'compact') {
                return `
                    <div class="ef-compact-toggle">
                        <button class="ef-btn ef-btn-primary ef-btn-open-editor" data-instance="${this.instanceId}">
                            <i class="fas fa-edit"></i> ${this.options.compactButtonText}
                        </button>
                    </div>
                    <div class="ef-article-builder" id="${this.instanceId}" style="display: none;">
                        ${this.getEditorBodyHTML()}
                    </div>
                    ${this.getHiddenInput()}
                `;
            }

            const heightStyle = this.options.displayMode === 'inline-limited'
                ? `max-height: ${this.options.maxHeight}; overflow-y: auto;`
                : '';

            return `
                <div class="ef-article-builder ef-mode-${this.options.displayMode}" id="${this.instanceId}" style="${heightStyle}">
                    ${this.getEditorBodyHTML()}
                </div>
                ${this.getHiddenInput()}
            `;
        }

        getEditorBodyHTML() {
            const premiumBadge = this.isPremium ? '<span class="ef-premium-badge" style="background: linear-gradient(135deg, #f59e0b, #f97316); color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; margin-left: 0.5rem; font-weight: 600;">PRO</span>' : '';
            return `
                <div class="ef-editor-header">
                    <h2 class="ef-editor-title">Article Editor ${premiumBadge}</h2>
                    <div class="ef-editor-actions">
                        <button class="ef-btn ef-btn-secondary ef-btn-live-preview" data-action="toggle-live-preview">
                            <i class="fas fa-eye"></i> Live Preview
                        </button>
                        <button class="ef-btn ef-btn-import" data-action="import"><i class="fas fa-file-import"></i> Import</button>
                        <button class="ef-btn ef-btn-json" data-action="json"><i class="fas fa-code"></i> JSON</button>
                        <button class="ef-btn ef-btn-html" data-action="html"><i class="fas fa-file-code"></i> HTML</button>
                        <button class="ef-btn ef-btn-clear" data-action="clear"><i class="fas fa-trash"></i> Clear</button>
                        <button class="ef-btn ef-btn-preview" data-action="preview"><i class="fas fa-expand"></i> Full Preview</button>
                    </div>
                </div>
                <div class="ef-editor-body">
                    <div class="ef-canvas" id="ef-canvas-${this.instanceId}">
                        <p class="ef-canvas-placeholder"><i class="fas fa-hand-pointer"></i> Drag komponen ke sini untuk memulai</p>
                    </div>
                    <div class="ef-components">
                        <h3 class="ef-components-title">Komponen</h3>
                        ${this.getComponentsHTML()}
                    </div>
                </div>
            `;
        }

        getComponentsHTML() {
            let html = '';

            for (const [groupName, components] of Object.entries(this.componentGroups)) {
                html += `<div class="ef-component-group"><h4 class="ef-component-group-title">${groupName}</h4>`;

                if (typeof components === 'object' && !Array.isArray(components)) {
                    html += `<div class="ef-component-list">`;
                    for (const [subGroupName, subComponents] of Object.entries(components)) {
                        html += `
                            <div class="ef-component-submenu">
                                <div class="ef-component-submenu-header" onclick="this.parentElement.classList.toggle('ef-submenu-open')">
                                    <i class="fas fa-chevron-right ef-submenu-icon"></i>
                                    <span>${subGroupName}</span>
                                </div>
                                <div class="ef-component-submenu-content">`;

                        subComponents.forEach(type => {
                            const icon = this.componentIcons[type] || 'cube';
                            const label = this.componentLabels[type] || type;
                            html += `<div class="ef-component-item" draggable="true" data-type="${type}">
                                <i class="fas fa-${icon}"></i> ${label}
                            </div>`;
                        });

                        html += `</div></div>`;
                    }
                    html += `</div>`;
                } else {
                    html += `<div class="ef-component-list">`;
                    components.forEach(type => {
                        const icon = this.componentIcons[type] || 'cube';
                        const label = this.componentLabels[type] || type;
                        html += `<div class="ef-component-item" draggable="true" data-type="${type}">
                            <i class="fas fa-${icon}"></i> ${label}
                        </div>`;
                    });
                    html += `</div>`;
                }

                html += `</div>`;
            }

            return html;
        }

        getModalsHTML() {
            return `
                <div class="ef-modal" id="ef-modal-edit">
                    <div class="ef-modal-content">
                        <div class="ef-modal-header">
                            <h3>Edit Konten</h3>
                            <button class="ef-modal-close">&times;</button>
                        </div>
                        <div class="ef-modal-body" id="ef-edit-form"></div>
                        <div class="ef-modal-footer">
                            <button class="ef-btn ef-btn-primary" data-action="save">Simpan</button>
                        </div>
                    </div>
                </div>
                <div class="ef-modal" id="ef-modal-preview">
                    <div class="ef-modal-content ef-modal-large">
                        <div class="ef-modal-header">
                            <h3>Preview Artikel</h3>
                            <button class="ef-modal-close">&times;</button>
                        </div>
                        <div class="ef-modal-body">
                            <div class="ef-preview-container" id="ef-preview-content"></div>
                        </div>
                    </div>
                </div>
                <div class="ef-modal" id="ef-modal-code">
                    <div class="ef-modal-content ef-modal-md">
                        <div class="ef-modal-header">
                            <h3 id="ef-code-title">Code</h3>
                            <button class="ef-btn ef-btn-sm" data-action="copy-code"><i class="fas fa-copy"></i> Copy</button>
                            <button class="ef-modal-close">&times;</button>
                        </div>
                        <div class="ef-modal-body">
                            <pre class="ef-code-block"><code id="ef-code-content"></code></pre>
                        </div>
                    </div>
                </div>
            `;
        }

        getHiddenInput() {
            if (!this.inputName) return '';

            // Don't create if already exists (will be handled by setupHiddenInput)
            const existing = this.container.querySelector(`textarea[name="${this.inputName}"]`);
            if (existing) return '';

            return `<textarea name="${this.inputName}" style="display: none;"></textarea>`;
        }

        updateHiddenInput() {
            if (!this.inputName) return;

            try {
                const html = this.generateHTML(true);
                this.container.querySelector(`textarea[name="${this.inputName}"]`).value = html;

                // Trigger change event for form validation/tracking
                const event = new Event('change', { bubbles: true });
                this.container.querySelector(`textarea[name="${this.inputName}"]`).dispatchEvent(event);
            } catch (error) {
                console.error('Failed to update hidden input:', error);
            }
        }

        loadInitialContent() {
            // Priority order:
            // 1. data-value attribute (from database)
            // 2. initialContent option (from JavaScript)
            // 3. existing textarea value
            // 4. empty state

            let contentToLoad = null;

            // Priority 1: data-value attribute
            if (this.initialDataValue) {
                contentToLoad = this.initialDataValue;
                console.log('✓ Loading content from data-value attribute');
            }
            // Priority 2: initialContent option
            else if (this.options.initialContent) {
                contentToLoad = this.options.initialContent;
                console.log('✓ Loading content from initialContent option');
            }
            // Priority 3: existing textarea value
            else if (this.container.querySelector(`textarea[name="${this.inputName}"]`) && this.container.querySelector(`textarea[name="${this.inputName}"]`).value.trim()) {
                contentToLoad = this.container.querySelector(`textarea[name="${this.inputName}"]`).value;
                console.log('✓ Loading content from textarea value');
            }

            // Load the content if available
            if (contentToLoad) {
                const success = this.import(contentToLoad);
                if (!success) {
                    console.warn('⚠ Failed to load initial content, starting with empty editor');
                }
            }
        }

        // ============================================
        // THEME METHODS
        // ============================================
        applyEditorTheme() {
            const themeVars = this.customEditorTheme || this.editorThemes[this.currentEditorTheme] || this.editorThemes.glassmorphism;
            for (const [key, value] of Object.entries(themeVars)) {
                this.container.style.setProperty(key, value);
            }
        }

        applyContentTheme(previewContainer) {
            const themeVars = this.customContentTheme || this.contentThemes[this.currentContentTheme] || this.contentThemes.glassmorphism;
            for (const [key, value] of Object.entries(themeVars)) {
                previewContainer.style.setProperty(key, value);
            }
        }

        setEditorTheme(theme) {
            if (typeof theme === 'string') {
                this.currentEditorTheme = theme;
                this.customEditorTheme = null;
            } else if (typeof theme === 'object') {
                this.currentEditorTheme = 'custom';
                this.customEditorTheme = theme;
            }
            this.applyEditorTheme();
        }

        setContentTheme(theme) {
            if (typeof theme === 'string') {
                this.currentContentTheme = theme;
                this.customContentTheme = null;
            } else if (typeof theme === 'object') {
                this.currentContentTheme = 'custom';
                this.customContentTheme = theme;
            }
            const previewModal = document.querySelector(`#ef-modals-${this.instanceId} #ef-modal-preview`);
            if (previewModal && previewModal.classList.contains('ef-modal-active')) {
                this.showPreview();
            }
        }

        getContentThemeCSS() {
            const themeVars = this.customContentTheme || this.contentThemes[this.currentContentTheme] || this.contentThemes.glassmorphism;
            let css = ':root {\n';
            for (const [key, value] of Object.entries(themeVars)) {
                css += `  ${key}: ${value};\n`;
            }
            css += '}';
            return css;
        }

        // ============================================
        // EVENT HANDLING
        // ============================================
        attachEvents() {
            const openBtn = this.container.querySelector('.ef-btn-open-editor');
            if (openBtn) {
                openBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.toggleEditor();
                });
            }

            this.container.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (btn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    switch (action) {
                        case 'toggle-live-preview': this.toggleLivePreview(); break;
                        case 'preview': this.showPreview(); break;
                        case 'json': this.showJSON(); break;
                        case 'html': this.showHTML(); break;
                        case 'import': this.showImport(); break;
                        case 'clear': this.clearCanvas(); break;
                    }
                    return;
                }

                const block = e.target.closest('.ef-canvas-block');
                if (block) {
                    const deleteBtn = e.target.closest('.ef-canvas-block-delete');
                    if (deleteBtn) {
                        e.stopPropagation();
                        const index = parseInt(block.dataset.index);
                        if (confirm('Hapus komponen ini?')) {
                            this.data.splice(index, 1);
                            this.renderCanvas();
                            if (this.options.onChange) this.options.onChange(this.generateHTML(true));
                        }
                        return;
                    }

                    e.stopPropagation();
                    this.currentEditIndex = parseInt(block.dataset.index);
                    if (isNaN(this.currentEditIndex) || this.currentEditIndex < 0 || this.currentEditIndex >= this.data.length) {
                        console.error('Invalid block index:', block.dataset.index);
                        return;
                    }
                    this.showEditModal();
                }
            });

            document.addEventListener('click', (e) => {
                const modalContainer = e.target.closest(`#ef-modals-${this.instanceId}`);
                if (!modalContainer) return;

                const modalBtn = e.target.closest('.ef-modal [data-action]');
                if (modalBtn) {
                    const modal = modalBtn.closest('.ef-modal');
                    if (!modal || !modal.classList.contains('ef-modal-active')) return;

                    e.preventDefault();
                    e.stopPropagation();
                    const action = modalBtn.dataset.action;
                    switch (action) {
                        case 'save': this.saveEdit(); break;
                        case 'copy-code': this.copyCode(); break;
                    }
                    return;
                }

                if (e.target.classList.contains('ef-modal-close') || e.target.closest('.ef-modal-close')) {
                    e.preventDefault();
                    this.closeModal();
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.closeModal();
            });
        }

        // ============================================
        // DRAG & DROP
        // ============================================
        initDragDrop() {
            const canvas = this.container.querySelector('.ef-canvas');
            const components = this.container.querySelectorAll('.ef-component-item');

            // State variables untuk track apa yang sedang di-drag
            this.dragState = {
                isNewComponent: false,
                isSorting: false,
                draggedType: null,
                draggedBlock: null,
                dropPosition: null
            };

            // Drag from sidebar components
            components.forEach(component => {
                component.addEventListener('dragstart', (e) => {
                    this.dragState.isNewComponent = true;
                    this.dragState.isSorting = false;
                    this.dragState.draggedType = e.target.dataset.type;
                    this.dragState.draggedBlock = null;
                    this.dragState.dropPosition = null;
                    e.dataTransfer.effectAllowed = 'copy';
                });

                component.addEventListener('dragend', () => {
                    this.dragState.isNewComponent = false;
                    this.dragState.draggedType = null;
                    this.dragState.dropPosition = null;
                });
            });

            canvas.addEventListener('dragover', (e) => {
                e.preventDefault();

                if (this.dragState.isSorting) {
                    e.dataTransfer.dropEffect = 'move';
                    const afterElement = this.getDragAfterElement(canvas, e.clientY);
                    const draggingBlock = this.dragState.draggedBlock;

                    if (draggingBlock) {
                        if (afterElement == null) {
                            canvas.appendChild(draggingBlock);
                        } else {
                            canvas.insertBefore(draggingBlock, afterElement);
                        }
                    }
                } else if (this.dragState.isNewComponent) {
                    e.dataTransfer.dropEffect = 'copy';
                    // Track posisi drop untuk component baru
                    this.dragState.dropPosition = this.getDragAfterElement(canvas, e.clientY);
                }
            });

            canvas.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (this.dragState.isNewComponent && this.dragState.draggedType) {
                    // Add new component di posisi yang tepat
                    const blockData = { ...this.templates[this.dragState.draggedType] };

                    if (this.dragState.dropPosition === null || !this.dragState.dropPosition) {
                        // Drop di paling bawah atau canvas kosong
                        this.data.push(blockData);
                    } else {
                        // Drop sebelum afterElement - pastikan element valid dan punya dataset
                        if (this.dragState.dropPosition.dataset && this.dragState.dropPosition.dataset.index) {
                            const afterIndex = parseInt(this.dragState.dropPosition.dataset.index);
                            if (!isNaN(afterIndex) && afterIndex >= 0 && afterIndex <= this.data.length) {
                                this.data.splice(afterIndex, 0, blockData);
                            } else {
                                // Fallback jika index invalid
                                this.data.push(blockData);
                            }
                        } else {
                            // Fallback jika element tidak punya dataset yang valid
                            this.data.push(blockData);
                        }
                    }

                    this.renderCanvas();
                    if (this.options.onChange) this.options.onChange(this.generateHTML(true));

                    this.dragState.isNewComponent = false;
                    this.dragState.draggedType = null;
                    this.dragState.dropPosition = null;
                } else if (this.dragState.isSorting) {
                    // Update order setelah sorting
                    this.updateDataFromCanvas();
                    if (this.dragState.draggedBlock) {
                        this.dragState.draggedBlock.style.opacity = '';
                    }
                    this.dragState.isSorting = false;
                    this.dragState.draggedBlock = null;
                }
            });

            this.initSortable(canvas);
        }

        initSortable(canvas) {
            canvas.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('ef-canvas-block')) {
                    this.dragState.isSorting = true;
                    this.dragState.isNewComponent = false;
                    this.dragState.draggedBlock = e.target;
                    e.target.style.opacity = '0.5';
                    e.dataTransfer.effectAllowed = 'move';
                }
            });

            canvas.addEventListener('dragend', (e) => {
                if (e.target.classList.contains('ef-canvas-block')) {
                    e.target.style.opacity = '';
                }
            });
        }

        getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.ef-canvas-block')]
                .filter(el => el !== this.dragState.draggedBlock);

            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;

                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

        initModals() {
            let modalContainer = document.getElementById(`ef-modals-${this.instanceId}`);
            if (!modalContainer) {
                modalContainer = document.createElement('div');
                modalContainer.id = `ef-modals-${this.instanceId}`;
                modalContainer.innerHTML = this.getModalsHTML();
                document.body.appendChild(modalContainer);
            }
        }

        // ============================================
        // COMPONENT PREVIEW
        // ============================================
        attachComponentPreviewEvents() {
            const components = this.container.querySelectorAll('.ef-component-item');
            let hoverTimer = null;
            const HOVER_DELAY = 300;

            components.forEach(item => {
                item.addEventListener('mouseenter', () => {
                    const type = item.dataset.type;
                    if (hoverTimer) clearTimeout(hoverTimer);
                    hoverTimer = setTimeout(() => {
                        this.showComponentPreview(type, item);
                    }, HOVER_DELAY);
                });

                item.addEventListener('mouseleave', () => {
                    if (hoverTimer) {
                        clearTimeout(hoverTimer);
                        hoverTimer = null;
                    }
                    this.hideComponentPreview();
                });
            });
        }

        showComponentPreview(type, target) {
            this.hideComponentPreview();
            const template = this.templates[type];
            if (!template) return;

            const themeVars = this.customContentTheme || this.contentThemes[this.currentContentTheme] || this.contentThemes.glassmorphism;
            const styleVars = Object.entries(themeVars).map(([key, value]) => `${key}: ${value}`).join('; ');

            const preview = document.createElement('div');
            preview.className = 'ef-component-preview-tooltip';
            preview.innerHTML = `
                <div class="ef-component-preview-header">
                    <i class="fas fa-eye"></i> Preview
                </div>
                <div class="ef-component-preview-body">
                    <div class="ef-preview-container" style="${styleVars}; padding: 0.875rem;">
                        ${this.renderSingleComponentPreview(template)}
                    </div>
                </div>
            `;

            document.body.appendChild(preview);

            const rect = target.getBoundingClientRect();
            const previewRect = preview.getBoundingClientRect();
            let left = rect.right + 15;
            let top = rect.top;

            if (left + previewRect.width > window.innerWidth) {
                left = rect.left - previewRect.width - 15;
            }
            if (top + previewRect.height > window.innerHeight) {
                top = window.innerHeight - previewRect.height - 10;
            }
            if (top < 10) top = 10;

            preview.style.position = 'fixed';
            preview.style.left = left + 'px';
            preview.style.top = top + 'px';
            preview.style.zIndex = '999999';
        }

        hideComponentPreview() {
            const existing = document.querySelector('.ef-component-preview-tooltip');
            if (existing) {
                existing.classList.add('ef-tooltip-closing');
                setTimeout(() => {
                    if (existing.parentNode) existing.remove();
                }, 150);
            }
        }

        renderSingleComponentPreview(block) {
            const originalData = this.data;
            this.data = [block];
            const html = this.generatePreviewHTML();
            this.data = originalData;
            return html;
        }

        // ============================================
        // CANVAS & DATA MANAGEMENT
        // ============================================
        addBlock(type) {
            const blockData = { ...this.templates[type] };
            this.data.push(blockData);
            this.renderCanvas();
            if (this.options.onChange) this.options.onChange(this.generateHTML(true));
        }

        renderCanvas() {
            const canvas = this.container.querySelector(`#ef-canvas-${this.instanceId}`);
            if (!canvas) return;

            const placeholder = canvas.querySelector('.ef-canvas-placeholder');

            if (this.data.length === 0) {
                if (!placeholder) {
                    canvas.innerHTML = '<p class="ef-canvas-placeholder"><i class="fas fa-hand-pointer"></i> Drag komponen ke sini untuk memulai</p>';
                }
                this.updateLivePreview();
                this.updateHiddenInput()
                return;
            }

            if (placeholder) placeholder.remove();

            canvas.innerHTML = '';
            this.data.forEach((block, index) => {
                if (!block || !block.tag) return;
                const blockEl = document.createElement('div');
                blockEl.className = 'ef-canvas-block';
                blockEl.draggable = true;
                blockEl.dataset.index = index;
                blockEl.innerHTML = this.getBlockPreview(block);
                canvas.appendChild(blockEl);
            });

            this.updateLivePreview();
            this.updateHiddenInput();
        }

        getBlockPreview(block) {
            if (!block || !block.tag) {
                return '<i class="fas fa-exclamation-triangle"></i> <span>Invalid block</span>';
            }

            const icon = this.componentIcons[block.type] || this.componentIcons[block.tag] || 'file';
            let text = block.text;

            if (block.tag === 'ol' || block.tag === 'ul') {
                const items = text.split('\n').filter(i => i.trim()).slice(0, 2);
                text = items.join(', ') + '...';
            } else if (text.length > 60) {
                text = text.substring(0, 60) + '...';
            }

            return `
                <i class="fas fa-${icon}"></i>
                <span>${text}</span>
                <button class="ef-canvas-block-delete" title="Hapus">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }

        updateDataFromCanvas() {
            const canvas = this.container.querySelector('.ef-canvas');
            const blocks = [...canvas.querySelectorAll('.ef-canvas-block')];

            const newData = blocks.map(block => {
                const index = parseInt(block.dataset.index);
                if (index >= 0 && index < this.data.length) {
                    return this.data[index];
                }
                return null;
            }).filter(item => item !== null);

            this.data = newData;
            this.renderCanvas();

            if (this.options.onChange) {
                this.options.onChange(this.generateHTML(true));
            }
        }

        clearCanvas() {
            if (confirm('Hapus semua komponen?')) {
                this.data = [];
                this.renderCanvas();
                if (this.options.onChange) this.options.onChange(this.generateHTML(true));
            }
        }

        toggleEditor() {
            this.editorVisible = !this.editorVisible;
            const editorDiv = this.container.querySelector(`#${this.instanceId}`);
            const toggleBtn = this.container.querySelector('.ef-btn-open-editor');

            if (this.editorVisible) {
                if (editorDiv) editorDiv.style.display = 'block';
                if (toggleBtn) {
                    toggleBtn.innerHTML = '<i class="fas fa-times"></i> Close Editor';
                }
            } else {
                if (editorDiv) editorDiv.style.display = 'none';
                if (toggleBtn) {
                    toggleBtn.innerHTML = `<i class="fas fa-edit"></i> ${this.options.compactButtonText}`;
                }
            }
        }

        // PART 3 - Edit Modal & Form Methods
        // Paste setelah toggleEditor() di Part 2
        // WARNING: File ini sangat panjang karena berisi semua edit form untuk setiap komponen

        // ============================================
        // EDIT MODAL & FORM
        // ============================================
        showEditModal() {
            if (this.currentEditIndex < 0 || this.currentEditIndex >= this.data.length) {
                console.error(`Invalid currentEditIndex:`, this.currentEditIndex);
                return;
            }

            const block = this.data[this.currentEditIndex];
            if (!block) {
                console.error(`Block not found at index:`, this.currentEditIndex);
                return;
            }

            const modal = document.body.querySelector(`#ef-modals-${this.instanceId} #ef-modal-edit`);
            if (!modal) {
                console.error(`Modal not found`);
                return;
            }

            const formContainer = modal.querySelector('#ef-edit-form');
            formContainer.innerHTML = this.getEditForm(block);
            modal.classList.add('ef-modal-active');
            document.body.classList.add('ef-modal-open');
            this.attachEditFormEvents(block, formContainer);
        }

        getEditForm(block) {
            if (block.tag === 'h2' || block.tag === 'h3' || block.tag === 'h4' || (block.tag === 'p' && !block.type)) {
                return `<div class="ef-form-group"><label>Teks</label><textarea class="ef-form-control" id="ef-edit-text" rows="4">${this.escapeHtml(block.text)}</textarea></div>`;
            }

            if (block.tag === 'ol' || block.tag === 'ul') {
                const items = block.text.split('\n').filter(i => i.trim());
                let html = '<div class="ef-form-group"><label>Item List</label><div id="ef-list-items">';
                items.forEach((item) => {
                    html += `<div class="ef-list-item"><input type="text" class="ef-form-control" value="${this.escapeHtml(item)}" data-list-item><button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button></div>`;
                });
                html += '</div><button class="ef-btn ef-btn-sm" id="ef-add-list-item"><i class="fas fa-plus"></i> Tambah Item</button></div>';
                return html;
            }

            if (block.type === 'code-block') {
                return `<div class="ef-form-group"><label>Kode</label><textarea class="ef-form-control ef-code-input" id="ef-edit-text" rows="8">${this.escapeHtml(block.text)}</textarea></div>`;
            }

            if (block.type === 'tip-info' || block.type === 'tip-success' || block.type === 'tip-warning' ||
                block.type === 'tip-danger' || block.type === 'tip-note' || block.type === 'tip-question' ||
                block.type === 'tip-star' || block.type === 'tip-check') {
                const lines = block.text.split('\n');
                const title = lines[0] || '';
                const content = lines.slice(1).join('\n');
                return `<div class="ef-form-group"><label>Judul</label><input type="text" class="ef-form-control" id="ef-tip-title" value="${this.escapeHtml(title)}"></div><div class="ef-form-group"><label>Konten</label><textarea class="ef-form-control" id="ef-tip-content" rows="3">${this.escapeHtml(content)}</textarea></div>`;
            }

            if (block.type === 'tip-quote') {
                const lines = block.text.split('\n');
                const label = lines[0] || 'Quote';
                const content = lines[1] || '';
                const author = lines[2] || '';
                return `<div class="ef-form-group"><label>Label (opsional)</label><input type="text" class="ef-form-control" id="ef-tip-title" value="${this.escapeHtml(label)}" placeholder="Quote"></div><div class="ef-form-group"><label>Kutipan</label><textarea class="ef-form-control" id="ef-tip-content" rows="3" placeholder="Masukkan kutipan...">${this.escapeHtml(content)}</textarea></div><div class="ef-form-group"><label>Nama Pengutip</label><input type="text" class="ef-form-control" id="ef-quote-author" value="${this.escapeHtml(author)}" placeholder="John Doe"></div>`;
            }

            if (block.type === 'tip-steps') {
                const lines = block.text.split('\n');
                const title = lines[0] || 'Quick Steps';
                const steps = lines.slice(1);
                let html = `<div class="ef-form-group"><label>Judul</label><input type="text" class="ef-form-control" id="ef-tip-title" value="${this.escapeHtml(title)}"></div><div class="ef-form-group"><label>Langkah-langkah</label><div id="ef-steps-items">`;
                steps.forEach((step) => {
                    html += `<div class="ef-list-item"><input type="text" class="ef-form-control" value="${this.escapeHtml(step)}" data-step-item placeholder="Langkah..."><button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button></div>`;
                });
                html += '</div><button class="ef-btn ef-btn-sm" id="ef-add-step-item"><i class="fas fa-plus"></i> Tambah Langkah</button></div>';
                return html;
            }

            if (block.type === 'card-basic') {
                const lines = block.text.split('\n');
                return `<div class="ef-form-group"><label>Judul Card</label><input type="text" class="ef-form-control" id="ef-card-title" value="${this.escapeHtml(lines[0] || '')}"></div><div class="ef-form-group"><label>Konten Card</label><textarea class="ef-form-control" id="ef-card-content" rows="3">${this.escapeHtml(lines.slice(1).join('\n'))}</textarea></div>`;
            }

            if (block.type === 'card-image') {
                const lines = block.text.split('\n');
                const title = lines[0] || '';
                const content = lines[1] || '';
                const imageUrl = lines[2] || 'https://via.placeholder.com/400x200';
                return `<div class="ef-form-group"><label>Image URL</label><input type="text" class="ef-form-control" id="ef-card-image" value="${this.escapeHtml(imageUrl)}" placeholder="https://example.com/image.jpg"></div><div class="ef-form-group"><label>Judul Card</label><input type="text" class="ef-form-control" id="ef-card-title" value="${this.escapeHtml(title)}"></div><div class="ef-form-group"><label>Deskripsi</label><textarea class="ef-form-control" id="ef-card-content" rows="2">${this.escapeHtml(content)}</textarea></div>`;
            }

            if (block.type === 'card-icon-top') {
                const lines = block.text.split('\n');
                const icon = lines[0] || 'fas fa-star';
                const title = lines[1] || '';
                const content = lines[2] || '';
                return `<div class="ef-form-group"><label>Icon Class</label><input type="text" class="ef-form-control" id="ef-card-icon" value="${this.escapeHtml(icon)}" placeholder="fas fa-rocket"></div><div class="ef-form-group"><label>Judul Card</label><input type="text" class="ef-form-control" id="ef-card-title" value="${this.escapeHtml(title)}"></div><div class="ef-form-group"><label>Deskripsi</label><textarea class="ef-form-control" id="ef-card-content" rows="2">${this.escapeHtml(content)}</textarea></div>`;
            }

            if (block.type === 'card-hover') {
                const lines = block.text.split('\n');
                const title = lines[0] || '';
                const content = lines.slice(1).join('\n');
                return `<div class="ef-form-group"><label>Judul Card</label><input type="text" class="ef-form-control" id="ef-card-title" value="${this.escapeHtml(title)}"></div><div class="ef-form-group"><label>Konten Card</label><textarea class="ef-form-control" id="ef-card-content" rows="3">${this.escapeHtml(content)}</textarea></div>`;
            }

            if (block.type === 'card-bordered') {
                const lines = block.text.split('\n');
                const title = lines[0] || '';
                const content = lines.slice(1).join('\n');
                return `<div class="ef-form-group"><label>Judul Card</label><input type="text" class="ef-form-control" id="ef-card-title" value="${this.escapeHtml(title)}"></div><div class="ef-form-group"><label>Konten Card</label><textarea class="ef-form-control" id="ef-card-content" rows="3">${this.escapeHtml(content)}</textarea></div>`;
            }

            if (block.type === 'card-gradient') {
                const lines = block.text.split('\n');
                const title = lines[0] || '';
                const content = lines.slice(1).join('\n');
                return `<div class="ef-form-group"><label>Judul Card</label><input type="text" class="ef-form-control" id="ef-card-title" value="${this.escapeHtml(title)}"></div><div class="ef-form-group"><label>Konten Card</label><textarea class="ef-form-control" id="ef-card-content" rows="3">${this.escapeHtml(content)}</textarea></div>`;
            }

            if (block.type === 'card-stat') {
                const lines = block.text.split('\n');
                const parts = lines[0].split('|');
                const number = parts[0] || '0';
                const label = parts[1] || 'Statistic';
                const description = lines.slice(1).join('\n');
                return `<div class="ef-form-group"><label>Angka/Nilai</label><input type="text" class="ef-form-control" id="ef-stat-number" value="${this.escapeHtml(number)}" placeholder="1,234"></div><div class="ef-form-group"><label>Label</label><input type="text" class="ef-form-control" id="ef-stat-label" value="${this.escapeHtml(label)}" placeholder="Total Users"></div><div class="ef-form-group"><label>Deskripsi (opsional)</label><textarea class="ef-form-control" id="ef-stat-desc" rows="2">${this.escapeHtml(description)}</textarea></div>`;
            }

            // REPLACE block card-grid dengan 3 variant ini di getEditForm():

            if (block.type === 'card-grid-2col' || block.type === 'card-grid-3col') {
                const cards = block.text.split('\n').filter(c => c.trim());
                const gridType = block.type === 'card-grid-2col' ? '2 Kolom' : '3 Kolom';
                let html = `<div class="ef-form-group"><label>Cards (Grid ${gridType})</label><div id="ef-card-grid-items">`;
                cards.forEach((card, idx) => {
                    const parts = card.split('|');
                    const title = parts[0] || '';
                    const icon = parts[1] || 'fas fa-star';
                    const content = parts[2] || '';
                    html += `<div class="ef-card-grid-item" style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                            <span style="color: white; font-weight: 600;">Card ${idx + 1}</span>
                            <button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.closest('.ef-card-grid-item').remove()"><i class="fas fa-trash"></i></button>
                        </div>
                        <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Judul</label>
                            <input type="text" class="ef-form-control" data-card-title value="${this.escapeHtml(title)}" placeholder="Judul Card">
                        </div>
                        <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Icon Class</label>
                            <input type="text" class="ef-form-control" data-card-icon value="${this.escapeHtml(icon)}" placeholder="fas fa-star">
                        </div>
                        <div class="ef-form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Deskripsi</label>
                            <textarea class="ef-form-control" data-card-content rows="2" placeholder="Deskripsi card">${this.escapeHtml(content)}</textarea>
                        </div>
                    </div>`;
                });
                html += '</div><button class="ef-btn ef-btn-sm" id="ef-add-card-grid"><i class="fas fa-plus"></i> Tambah Card</button></div>';
                return html;
            }

            if (block.type === 'card-grid-masonry') {
                const cards = block.text.split('\n').filter(c => c.trim());
                let html = '<div class="ef-form-group"><label>Cards (Masonry Layout)</label><div id="ef-card-grid-items">';
                cards.forEach((card, idx) => {
                    const parts = card.split('|');
                    const title = parts[0] || '';
                    const icon = parts[1] || 'fas fa-star';
                    const size = parts[2] || 'medium';
                    const content = parts[3] || '';
                    html += `<div class="ef-card-grid-item" style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                            <span style="color: white; font-weight: 600;">Card ${idx + 1}</span>
                            <button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.closest('.ef-card-grid-item').remove()"><i class="fas fa-trash"></i></button>
                        </div>
                        <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Judul</label>
                            <input type="text" class="ef-form-control" data-card-title value="${this.escapeHtml(title)}" placeholder="Judul Card">
                        </div>
                        <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Icon Class</label>
                            <input type="text" class="ef-form-control" data-card-icon value="${this.escapeHtml(icon)}" placeholder="fas fa-star">
                        </div>
                        <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Ukuran Card</label>
                            <select class="ef-form-control" data-card-size style="padding: 0.5rem;">
                                <option value="short" ${size === 'short' ? 'selected' : ''}>Short</option>
                                <option value="medium" ${size === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="long" ${size === 'long' ? 'selected' : ''}>Long</option>
                            </select>
                        </div>
                        <div class="ef-form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Deskripsi</label>
                            <textarea class="ef-form-control" data-card-content rows="2" placeholder="Deskripsi card">${this.escapeHtml(content)}</textarea>
                        </div>
                    </div>`;
                });
                html += '</div><button class="ef-btn ef-btn-sm" id="ef-add-card-masonry"><i class="fas fa-plus"></i> Tambah Card</button></div>';
                return html;
            }

            if (block.type === 'cta-center' || block.type === 'cta-split' || block.type === 'cta-urgent') {
                const lines = block.text.split('\n').filter(l => l.trim());
                const title = lines[0] || '';
                const description = lines[1] || '';
                const buttons = lines.slice(2);
                let html = `<div class="ef-form-group">
                                <label>Judul CTA</label>
                                <input type="text" class="ef-form-control" id="ef-cta-title" value="${this.escapeHtml(title)}" placeholder="Call to Action Title">
                            </div>
                            <div class="ef-form-group">
                                <label>Deskripsi</label>
                                <textarea class="ef-form-control" id="ef-cta-desc" rows="2" placeholder="Deskripsi CTA...">${this.escapeHtml(description)}</textarea>
                            </div>
                            <div class="ef-form-group">
                                <label>Tombol</label>
                                <div id="ef-cta-buttons">`;
                buttons.forEach((btn, idx) => {
                    const parts = btn.split('|');
                    const text = parts[0] || '';
                    const url = parts[1] || '#';
                    html += `<div class="ef-cta-button-item" style="background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem; border: 1px solid rgba(255,255,255,0.1);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span style="color: white; font-weight: 600; font-size: 0.875rem;">Button ${idx + 1}</span>
                                <button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.closest('.ef-cta-button-item').remove()"><i class="fas fa-trash"></i></button>
                            </div>
                            <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                                <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Teks Button</label>
                                <input type="text" class="ef-form-control" data-btn-text value="${this.escapeHtml(text)}" placeholder="Button Text">
                            </div>
                            <div class="ef-form-group" style="margin-bottom: 0;">
                                <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">URL</label>
                                <input type="text" class="ef-form-control" data-btn-url value="${this.escapeHtml(url)}" placeholder="https://...">
                            </div>
                        </div>`;
                });
                html += `</div><button class="ef-btn ef-btn-sm" id="ef-add-cta-button"><i class="fas fa-plus"></i> Tambah Button</button></div>`;
                return html;
            }

            if (block.type === 'cta-minimal') {
                const lines = block.text.split('\n').filter(l => l.trim());
                const title = lines[0] || '';
                const description = lines[1] || '';
                const btnParts = lines[2] ? lines[2].split('|') : ['', '#'];
                const btnText = btnParts[0] || '';
                const btnUrl = btnParts[1] || '#';
                return `<div class="ef-form-group">
                            <label>Judul</label>
                            <input type="text" class="ef-form-control" id="ef-cta-title" value="${this.escapeHtml(title)}" placeholder="Title">
                        </div>
                        <div class="ef-form-group">
                            <label>Deskripsi</label>
                            <textarea class="ef-form-control" id="ef-cta-desc" rows="2" placeholder="Description...">${this.escapeHtml(description)}</textarea>
                        </div>
                        <div class="ef-form-group">
                            <label>Button Text</label>
                            <input type="text" class="ef-form-control" id="ef-cta-btn-text" value="${this.escapeHtml(btnText)}" placeholder="Click Here">
                        </div>
                        <div class="ef-form-group">
                            <label>Button URL</label>
                            <input type="text" class="ef-form-control" id="ef-cta-btn-url" value="${this.escapeHtml(btnUrl)}" placeholder="https://...">
                        </div>`;
            }

            if (block.type === 'cta-newsletter') {
                const lines = block.text.split('\n').filter(l => l.trim());
                const title = lines[0] || '';
                const description = lines[1] || '';
                const placeholder = lines[2] || 'your@email.com';
                const btnParts = lines[3] ? lines[3].split('|') : ['Subscribe', '#'];
                const btnText = btnParts[0] || 'Subscribe';
                const btnUrl = btnParts[1] || '#subscribe';
                return `<div class="ef-form-group">
                            <label>Judul</label>
                            <input type="text" class="ef-form-control" id="ef-cta-title" value="${this.escapeHtml(title)}" placeholder="Newsletter Title">
                        </div>
                        <div class="ef-form-group">
                            <label>Deskripsi</label>
                            <textarea class="ef-form-control" id="ef-cta-desc" rows="2" placeholder="Description...">${this.escapeHtml(description)}</textarea>
                        </div>
                        <div class="ef-form-group">
                            <label>Input Placeholder</label>
                            <input type="text" class="ef-form-control" id="ef-newsletter-placeholder" value="${this.escapeHtml(placeholder)}" placeholder="your@email.com">
                        </div>
                        <div class="ef-form-group">
                            <label>Button Text</label>
                            <input type="text" class="ef-form-control" id="ef-cta-btn-text" value="${this.escapeHtml(btnText)}" placeholder="Subscribe">
                        </div>
                        <div class="ef-form-group">
                            <label>Form Action URL</label>
                            <input type="text" class="ef-form-control" id="ef-cta-btn-url" value="${this.escapeHtml(btnUrl)}" placeholder="#subscribe">
                        </div>`;
            }

            // REPLACE block table di getEditForm() dengan:

            if (block.type === 'table-basic' || block.type === 'table-striped' || block.type === 'table-comparison') {
                const rows = block.text.split('\n').filter(r => r.trim());
                let html = `<div class="ef-form-group">
                                <label>Table Data</label>
                                <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border: 1px solid rgba(255,255,255,0.1);">
                                    <p style="color: rgba(255,255,255,0.7); font-size: 0.875rem; margin-bottom: 0.5rem;">
                                        <i class="fas fa-info-circle"></i> Baris pertama akan menjadi header
                                    </p>
                                </div>
                                <div id="ef-table-rows">`;

                rows.forEach((row, idx) => {
                    const cells = row.split('|');
                    let cellsHtml = '';
                    cells.forEach((cell, cellIdx) => {
                        cellsHtml += `<div class="ef-form-group" style="flex: 1; margin-bottom: 0; margin-right: 0.5rem;">
                                        <label style="font-size: 0.75rem; margin-bottom: 0.25rem; color: rgba(255,255,255,0.7);">
                                            ${idx === 0 ? 'Header' : 'Cell'} ${cellIdx + 1}
                                        </label>
                                        <input type="text" class="ef-form-control" data-table-cell value="${this.escapeHtml(cell.trim())}" placeholder="Cell ${cellIdx + 1}">
                                    </div>`;
                    });

                    html += `<div class="ef-table-row" style="background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px; margin-bottom: 0.75rem; border: 1px solid rgba(255,255,255,0.1);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                <span style="color: rgba(255,255,255,0.5); font-size: 0.875rem; font-weight: 600;">
                                    ${idx === 0 ? '📋 Header Row' : `📄 Row ${idx}`}
                                </span>
                                <button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.closest('.ef-table-row').remove()">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                ${cellsHtml}
                            </div>
                        </div>`;
                });

                html += `</div>
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                <button class="ef-btn ef-btn-sm" id="ef-add-table-row">
                                    <i class="fas fa-plus"></i> Tambah Baris
                                </button>
                                <button class="ef-btn ef-btn-sm ef-btn-secondary" id="ef-add-table-column">
                                    <i class="fas fa-plus"></i> Tambah Kolom
                                </button>
                            </div>
                        </div>`;
                return html;
            }

            if (block.type === 'timeline-vertical' || block.type === 'timeline-horizontal') {
                const items = block.text.split('\n').filter(i => i.trim());
                const timelineType = block.type === 'timeline-vertical' ? 'Vertical' : 'Horizontal';
                let html = `<div class="ef-form-group">
                                <label>Timeline Items (${timelineType})</label>
                            <div id="ef-timeline-items">`;

                items.forEach((item, idx) => {
                    const parts = item.split('|');
                    const date = parts[0] || '';
                    const title = parts[1] || '';
                    const description = parts[2] || '';

                    html += `<div class="ef-timeline-item" style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border: 1px solid rgba(255,255,255,0.1);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                    <span style="color: white; font-weight: 600;">
                                        <i class="fas fa-clock"></i> Event ${idx + 1}
                                    </span>
                                    <button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.closest('.ef-timeline-item').remove()">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                                <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                                    <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Tanggal/Periode</label>
                                    <input type="text" class="ef-form-control" data-timeline-date value="${this.escapeHtml(date)}" placeholder="2024 atau Q1 2024">
                                </div>
                                <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                                    <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Judul Event</label>
                                    <input type="text" class="ef-form-control" data-timeline-title value="${this.escapeHtml(title)}" placeholder="Milestone Title">
                                </div>
                                <div class="ef-form-group" style="margin-bottom: 0;">
                                    <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Deskripsi</label>
                                    <textarea class="ef-form-control" data-timeline-desc rows="2" placeholder="Deskripsi event...">${this.escapeHtml(description)}</textarea>
                                </div>
                            </div>`;
                });

                html += `</div>
                            <button class="ef-btn ef-btn-sm" id="ef-add-timeline-item">
                                <i class="fas fa-plus"></i> Tambah Event
                            </button>
                        </div>`;
                return html;
            }

            if (block.type === 'accordion-faq' || block.type === 'accordion-simple') {
                const items = block.text.split('\n').filter(i => i.trim());
                const accordionType = block.type === 'accordion-faq' ? 'FAQ' : 'Simple';
                let html = `<div class="ef-form-group">
                                <label>Accordion Items (${accordionType})</label>
                            <div id="ef-accordion-items">`;

                items.forEach((item, idx) => {
                    const parts = item.split('|');
                    const question = parts[0] || '';
                    const answer = parts[1] || '';

                    html += `<div class="ef-accordion-item" style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border: 1px solid rgba(255,255,255,0.1);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                <span style="color: white; font-weight: 600;">
                                    <i class="fas fa-${block.type === 'accordion-faq' ? 'question' : 'chevron-right'}"></i> Item ${idx + 1}
                                </span>
                                <button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.closest('.ef-accordion-item').remove()">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                            <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                                <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">${block.type === 'accordion-faq' ? 'Pertanyaan' : 'Judul'}</label>
                                <input type="text" class="ef-form-control" data-accordion-question value="${this.escapeHtml(question)}" placeholder="${block.type === 'accordion-faq' ? 'Apa itu...?' : 'Section Title'}">
                            </div>
                            <div class="ef-form-group" style="margin-bottom: 0;">
                                <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">${block.type === 'accordion-faq' ? 'Jawaban' : 'Konten'}</label>
                                <textarea class="ef-form-control" data-accordion-answer rows="3" placeholder="${block.type === 'accordion-faq' ? 'Penjelasan detail...' : 'Content...'}">${this.escapeHtml(answer)}</textarea>
                            </div>
                        </div>`;
                });

                html += `</div>
                            <button class="ef-btn ef-btn-sm" id="ef-add-accordion-item">
                                <i class="fas fa-plus"></i> Tambah Item
                            </button>
                        </div>`;
                return html;
            }

            // TAMBAHKAN di getEditForm() setelah accordion blocks:

            if (block.type === 'poll-emoji' || block.type === 'poll-rating' || block.type === 'poll-vote') {
                const lines = block.text.split('|');
                const question = lines[0] || '';
                const options = [];

                // Parse options (format: emoji|label or option|label)
                for (let i = 1; i < lines.length; i += 2) {
                    if (lines[i] && lines[i + 1]) {
                        options.push({ value: lines[i], label: lines[i + 1] });
                    }
                }

                const pollType = block.type === 'poll-emoji' ? 'Emoji Reactions' :
                    block.type === 'poll-rating' ? 'Star Rating' : 'Poll Options';

                let html = `<div class="ef-form-group">
                                <label>Pertanyaan/Judul</label>
                                <input type="text" class="ef-form-control" id="ef-poll-question" value="${this.escapeHtml(question)}" placeholder="Pertanyaan poll...">
                            </div>
                            <div class="ef-form-group">
                                <label>${pollType}</label>
                            <div id="ef-poll-options">`;

                options.forEach((opt, idx) => {
                    html += `<div class="ef-poll-option-item" style="background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem; border: 1px solid rgba(255,255,255,0.1);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span style="color: white; font-weight: 600; font-size: 0.875rem;">Option ${idx + 1}</span>
                                <button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.closest('.ef-poll-option-item').remove()">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                            <div style="display: grid; grid-template-columns: 100px 1fr; gap: 0.5rem;">
                                <div class="ef-form-group" style="margin-bottom: 0;">
                                    <label style="font-size: 0.75rem; margin-bottom: 0.25rem;">${block.type === 'poll-rating' ? 'Rating' : block.type === 'poll-emoji' ? 'Emoji' : 'Value'}</label>
                                    <input type="text" class="ef-form-control" data-poll-value value="${this.escapeHtml(opt.value)}" placeholder="${block.type === 'poll-rating' ? '⭐⭐⭐' : block.type === 'poll-emoji' ? '👍' : 'Option'}">
                                </div>
                                <div class="ef-form-group" style="margin-bottom: 0;">
                                    <label style="font-size: 0.75rem; margin-bottom: 0.25rem;">Label</label>
                                    <input type="text" class="ef-form-control" data-poll-label value="${this.escapeHtml(opt.label)}" placeholder="Label...">
                                </div>
                            </div>
                        </div>`;
                });

                html += `</div>
                            <button class="ef-btn ef-btn-sm" id="ef-add-poll-option">
                                <i class="fas fa-plus"></i> Tambah Option
                            </button>
                        </div>`;
                return html;
            }

            if (block.type === 'embed') {
                const parts = block.text.split('|');
                const embedType = parts[0] || 'youtube';
                const url = parts[1] || '';
                const caption = parts[2] || '';

                return `<div class="ef-form-group">
                            <label>Tipe Embed</label>
                            <select class="ef-form-control" id="ef-embed-type" style="padding: 0.75rem;">
                                <option value="youtube" ${embedType === 'youtube' ? 'selected' : ''}>YouTube</option>
                                <option value="vimeo" ${embedType === 'vimeo' ? 'selected' : ''}>Vimeo</option>
                                <option value="iframe" ${embedType === 'iframe' ? 'selected' : ''}>Custom Iframe</option>
                            </select>
                        </div>
                        <div class="ef-form-group">
                            <label>URL / Embed Code</label>
                            <input type="text" class="ef-form-control" id="ef-embed-url" value="${this.escapeHtml(url)}" placeholder="https://www.youtube.com/watch?v=...">
                            <small style="color: rgba(255,255,255,0.6); font-size: 0.8125rem; margin-top: 0.5rem; display: block;">
                                <i class="fas fa-info-circle"></i> YouTube: URL video biasa atau embed URL
                            </small>
                        </div>
                        <div class="ef-form-group">
                            <label>Caption (Opsional)</label>
                            <input type="text" class="ef-form-control" id="ef-embed-caption" value="${this.escapeHtml(caption)}" placeholder="Video title or description...">
                        </div>`;
            }

            if (block.type === 'divider-line' || block.type === 'divider-dashed' ||
                block.type === 'divider-dotted' || block.type === 'divider-gradient') {
                return `<div class="ef-form-group">
                            <label>Divider</label>
                            <p style="color: rgba(255,255,255,0.7); font-size: 0.875rem;">
                                <i class="fas fa-info-circle"></i> Divider tidak memerlukan konfigurasi. Tinggal gunakan untuk memisahkan section.
                            </p>
                            <div style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 8px; margin-top: 1rem; text-align: center;">
                                <div class="ef-${block.type}" style="margin: 0;"></div>
                            </div>
                        </div>`;
            }

            if (block.type === 'divider-text') {
                return `<div class="ef-form-group">
                            <label>Teks Divider</label>
                            <input type="text" class="ef-form-control" id="ef-divider-text" value="${this.escapeHtml(block.text)}" placeholder="∗ ∗ ∗">
                            <small style="color: rgba(255,255,255,0.6); font-size: 0.8125rem; margin-top: 0.5rem; display: block;">
                                <i class="fas fa-info-circle"></i> Gunakan karakter seperti: ∗ ∗ ∗, • • •, — ∼ —, atau teks custom
                            </small>
                        </div>`;
            }

            // TAMBAHKAN di getEditForm() setelah divider blocks:

            if (block.type === 'image') {
                const parts = block.text.split('|');
                const imageUrl = parts[0] || '';
                const title = parts[1] || '';
                const caption = parts[2] || '';

                return `<div class="ef-form-group">
                            <label>Sumber Gambar</label>
                            <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                                <button type="button" class="ef-btn ef-btn-sm ef-btn-secondary" id="ef-image-tab-url" style="flex: 1;">
                                    <i class="fas fa-link"></i> URL
                                </button>
                                <button type="button" class="ef-btn ef-btn-sm" id="ef-image-tab-file" style="flex: 1; background: rgba(255,255,255,0.1);">
                                    <i class="fas fa-upload"></i> Upload File
                                </button>
                            </div>
                        </div>

                        <div id="ef-image-url-section">
                            <div class="ef-form-group">
                                <label>Image URL</label>
                                <input type="text" class="ef-form-control" id="ef-image-url" value="${this.escapeHtml(imageUrl)}" placeholder="https://example.com/image.jpg">
                                <small style="color: rgba(255,255,255,0.6); font-size: 0.8125rem; margin-top: 0.5rem; display: block;">
                                    <i class="fas fa-info-circle"></i> URL gambar dari internet atau hasil upload
                                </small>
                            </div>
                        </div>

                        <div id="ef-image-file-section" style="display: none;">
                            <div class="ef-form-group">
                                <label>Upload Gambar</label>
                                <input type="file" class="ef-form-control" id="ef-image-file" accept="image/*" style="padding: 0.5rem;">
                                <small style="color: rgba(255,255,255,0.6); font-size: 0.8125rem; margin-top: 0.5rem; display: block;">
                                    <i class="fas fa-info-circle"></i> Pilih gambar dari komputer Anda (akan dikonversi ke base64)
                                </small>
                            </div>
                            <div id="ef-image-preview" style="margin-top: 1rem; display: none;">
                                <img src="" alt="Preview" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
                            </div>
                        </div>

                        <div class="ef-form-group">
                            <label>Alt Text / Title</label>
                            <input type="text" class="ef-form-control" id="ef-image-title" value="${this.escapeHtml(title)}" placeholder="Deskripsi gambar untuk SEO">
                        </div>

                        <div class="ef-form-group">
                            <label>Caption (Opsional)</label>
                            <textarea class="ef-form-control" id="ef-image-caption" rows="2" placeholder="Keterangan gambar yang ditampilkan di bawah...">${this.escapeHtml(caption)}</textarea>
                        </div>`;
            }

            return `<div class="ef-form-group"><label>Konten</label><textarea class="ef-form-control" id="ef-edit-text" rows="6">${this.escapeHtml(block.text)}</textarea></div>`;
        }

        attachEditFormEvents(block, container) {
            const addListBtn = container.querySelector('#ef-add-list-item');
            if (addListBtn) {
                addListBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const listContainer = container.querySelector('#ef-list-items');
                    const newItem = document.createElement('div');
                    newItem.className = 'ef-list-item';
                    newItem.innerHTML = `<input type="text" class="ef-form-control" data-list-item><button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>`;
                    listContainer.appendChild(newItem);
                });
            }

            const addCardGridBtn = container.querySelector('#ef-add-card-grid');
            if (addCardGridBtn) {
                addCardGridBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const gridContainer = container.querySelector('#ef-card-grid-items');
                    const cardCount = gridContainer.querySelectorAll('.ef-card-grid-item').length + 1;
                    const newCard = document.createElement('div');
                    newCard.className = 'ef-card-grid-item';
                    newCard.style.cssText = 'background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border: 1px solid rgba(255,255,255,0.1);';
                    newCard.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                            <span style="color: white; font-weight: 600;">Card ${cardCount}</span>
                                            <button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.closest('.ef-card-grid-item').remove()"><i class="fas fa-trash"></i></button>
                                        </div>
                                        <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Judul</label>
                                            <input type="text" class="ef-form-control" data-card-title placeholder="Judul Card">
                                        </div>
                                        <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Icon Class</label>
                                            <input type="text" class="ef-form-control" data-card-icon value="fas fa-star" placeholder="fas fa-star">
                                        </div>
                                        <div class="ef-form-group" style="margin-bottom: 0;">
                                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Deskripsi</label>
                                            <textarea class="ef-form-control" data-card-content rows="2" placeholder="Deskripsi card"></textarea>
                                        </div>`;
                    gridContainer.appendChild(newCard);
                });
            }

            const addMasonryBtn = container.querySelector('#ef-add-card-masonry');
            if (addMasonryBtn) {
                addMasonryBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const gridContainer = container.querySelector('#ef-card-grid-items');
                    const cardCount = gridContainer.querySelectorAll('.ef-card-grid-item').length + 1;
                    const newCard = document.createElement('div');
                    newCard.className = 'ef-card-grid-item';
                    newCard.style.cssText = 'background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border: 1px solid rgba(255,255,255,0.1);';
                    newCard.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                            <span style="color: white; font-weight: 600;">Card ${cardCount}</span>
                                            <button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.closest('.ef-card-grid-item').remove()"><i class="fas fa-trash"></i></button>
                                        </div>
                                        <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Judul</label>
                                            <input type="text" class="ef-form-control" data-card-title placeholder="Judul Card">
                                        </div>
                                        <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Icon Class</label>
                                            <input type="text" class="ef-form-control" data-card-icon value="fas fa-star" placeholder="fas fa-star">
                                        </div>
                                        <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Ukuran Card</label>
                                            <select class="ef-form-control" data-card-size style="padding: 0.5rem;">
                                                <option value="short">Short</option>
                                                <option value="medium" selected>Medium</option>
                                                <option value="long">Long</option>
                                            </select>
                                        </div>
                                        <div class="ef-form-group" style="margin-bottom: 0;">
                                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Deskripsi</label>
                                            <textarea class="ef-form-control" data-card-content rows="2" placeholder="Deskripsi card"></textarea>
                                        </div>`;
                    gridContainer.appendChild(newCard);
                });
            }

            const addCtaBtn = container.querySelector('#ef-add-cta-button');
            if (addCtaBtn) {
                addCtaBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const ctaContainer = container.querySelector('#ef-cta-buttons');
                    const btnCount = ctaContainer.querySelectorAll('.ef-cta-button-item').length + 1;
                    const newBtn = document.createElement('div');
                    newBtn.className = 'ef-cta-button-item';
                    newBtn.style.cssText = 'background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem; border: 1px solid rgba(255,255,255,0.1);';
                    newBtn.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                            <span style="color: white; font-weight: 600; font-size: 0.875rem;">Button ${btnCount}</span>
                                            <button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.closest('.ef-cta-button-item').remove()"><i class="fas fa-trash"></i></button>
                                        </div>
                                        <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Teks Button</label>
                                            <input type="text" class="ef-form-control" data-btn-text placeholder="Button Text">
                                        </div>
                                        <div class="ef-form-group" style="margin-bottom: 0;">
                                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">URL</label>
                                            <input type="text" class="ef-form-control" data-btn-url value="#" placeholder="https://...">
                                        </div>`;
                    ctaContainer.appendChild(newBtn);
                });
            }

            // UPDATE addTableRowBtn (ganti yang lama):
            const addTableRowBtn = container.querySelector('#ef-add-table-row');
            if (addTableRowBtn) {
                addTableRowBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tableContainer = container.querySelector('#ef-table-rows');
                    const firstRow = tableContainer.querySelector('.ef-table-row');
                    const colCount = firstRow ? firstRow.querySelectorAll('[data-table-cell]').length : 3;
                    const rowCount = tableContainer.querySelectorAll('.ef-table-row').length;

                    let cellsHtml = '';
                    for (let i = 0; i < colCount; i++) {
                        cellsHtml += `<div class="ef-form-group" style="flex: 1; margin-bottom: 0; margin-right: 0.5rem;">
                                        <label style="font-size: 0.75rem; margin-bottom: 0.25rem; color: rgba(255,255,255,0.7);">Cell ${i + 1}</label>
                                        <input type="text" class="ef-form-control" data-table-cell placeholder="Cell ${i + 1}">
                                    </div>`;
                    }

                    const newRow = document.createElement('div');
                    newRow.className = 'ef-table-row';
                    newRow.style.cssText = 'background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px; margin-bottom: 0.75rem; border: 1px solid rgba(255,255,255,0.1);';
                    newRow.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                            <span style="color: rgba(255,255,255,0.5); font-size: 0.875rem; font-weight: 600;">📄 Row ${rowCount}</span>
                                            <button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.closest('.ef-table-row').remove()"><i class="fas fa-trash"></i></button>
                                        </div>
                                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">${cellsHtml}</div>`;
                    tableContainer.appendChild(newRow);
                });
            }

            const addTableColBtn = container.querySelector('#ef-add-table-column');
            if (addTableColBtn) {
                addTableColBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tableRows = container.querySelectorAll('.ef-table-row');
                    tableRows.forEach((row, rowIdx) => {
                        const cellsContainer = row.querySelector('div[style*="display: flex"]');
                        const currentColCount = row.querySelectorAll('[data-table-cell]').length;
                        const newCell = document.createElement('div');
                        newCell.className = 'ef-form-group';
                        newCell.style.cssText = 'flex: 1; margin-bottom: 0; margin-right: 0.5rem;';
                        newCell.innerHTML = `<label style="font-size: 0.75rem; margin-bottom: 0.25rem; color: rgba(255,255,255,0.7);">
                                                ${rowIdx === 0 ? 'Header' : 'Cell'} ${currentColCount + 1}
                                            </label>
                                            <input type="text" class="ef-form-control" data-table-cell placeholder="Cell ${currentColCount + 1}">`;
                        cellsContainer.appendChild(newCell);
                    });
                });
            }

            const addStepBtn = container.querySelector('#ef-add-step-item');
            if (addStepBtn) {
                addStepBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const stepsContainer = container.querySelector('#ef-steps-items');
                    const newItem = document.createElement('div');
                    newItem.className = 'ef-list-item';
                    newItem.innerHTML = `<input type="text" class="ef-form-control" data-step-item placeholder="Langkah baru"><button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>`;
                    stepsContainer.appendChild(newItem);
                });
            }

            // TAMBAHKAN setelah table events:
            const addTimelineBtn = container.querySelector('#ef-add-timeline-item');
            if (addTimelineBtn) {
                addTimelineBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const timelineContainer = container.querySelector('#ef-timeline-items');
                    const itemCount = timelineContainer.querySelectorAll('.ef-timeline-item').length + 1;
                    const newItem = document.createElement('div');
                    newItem.className = 'ef-timeline-item';
                    newItem.style.cssText = 'background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border: 1px solid rgba(255,255,255,0.1);';
                    newItem.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                            <span style="color: white; font-weight: 600;"><i class="fas fa-clock"></i> Event ${itemCount}</span>
                                            <button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.closest('.ef-timeline-item').remove()"><i class="fas fa-trash"></i></button>
                                        </div>
                                        <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Tanggal/Periode</label>
                                            <input type="text" class="ef-form-control" data-timeline-date placeholder="2024 atau Q1 2024">
                                        </div>
                                        <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Judul Event</label>
                                            <input type="text" class="ef-form-control" data-timeline-title placeholder="Milestone Title">
                                        </div>
                                        <div class="ef-form-group" style="margin-bottom: 0;">
                                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">Deskripsi</label>
                                            <textarea class="ef-form-control" data-timeline-desc rows="2" placeholder="Deskripsi event..."></textarea>
                                        </div>`;
                    timelineContainer.appendChild(newItem);
                });
            }

            // TAMBAHKAN setelah timeline events:
            const addAccordionBtn = container.querySelector('#ef-add-accordion-item');
            if (addAccordionBtn) {
                addAccordionBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const accordionContainer = container.querySelector('#ef-accordion-items');
                    const itemCount = accordionContainer.querySelectorAll('.ef-accordion-item').length + 1;

                    // Detect accordion type from existing items
                    const firstItem = accordionContainer.querySelector('.ef-accordion-item i');
                    const isFAQ = firstItem && firstItem.classList.contains('fa-question');

                    const newItem = document.createElement('div');
                    newItem.className = 'ef-accordion-item';
                    newItem.style.cssText = 'background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border: 1px solid rgba(255,255,255,0.1);';
                    newItem.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                            <span style="color: white; font-weight: 600;"><i class="fas fa-${isFAQ ? 'question' : 'chevron-right'}"></i> Item ${itemCount}</span>
                                            <button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.closest('.ef-accordion-item').remove()"><i class="fas fa-trash"></i></button>
                                        </div>
                                        <div class="ef-form-group" style="margin-bottom: 0.5rem;">
                                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">${isFAQ ? 'Pertanyaan' : 'Judul'}</label>
                                            <input type="text" class="ef-form-control" data-accordion-question placeholder="${isFAQ ? 'Apa itu...?' : 'Section Title'}">
                                        </div>
                                        <div class="ef-form-group" style="margin-bottom: 0;">
                                            <label style="font-size: 0.8125rem; margin-bottom: 0.25rem;">${isFAQ ? 'Jawaban' : 'Konten'}</label>
                                            <textarea class="ef-form-control" data-accordion-answer rows="3" placeholder="${isFAQ ? 'Penjelasan detail...' : 'Content...'}"></textarea>
                                        </div>`;
                    accordionContainer.appendChild(newItem);
                });
            }

            // TAMBAHKAN setelah accordion events:
            const addPollOptionBtn = container.querySelector('#ef-add-poll-option');
            if (addPollOptionBtn) {
                addPollOptionBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const pollContainer = container.querySelector('#ef-poll-options');
                    const optionCount = pollContainer.querySelectorAll('.ef-poll-option-item').length + 1;

                    // Detect poll type
                    const firstOption = pollContainer.querySelector('.ef-poll-option-item label');
                    const pollType = firstOption ? firstOption.textContent.trim() : 'Value';

                    const newOption = document.createElement('div');
                    newOption.className = 'ef-poll-option-item';
                    newOption.style.cssText = 'background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem; border: 1px solid rgba(255,255,255,0.1);';
                    newOption.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                            <span style="color: white; font-weight: 600; font-size: 0.875rem;">Option ${optionCount}</span>
                                            <button class="ef-btn ef-btn-sm ef-btn-danger" onclick="this.closest('.ef-poll-option-item').remove()"><i class="fas fa-trash"></i></button>
                                        </div>
                                        <div style="display: grid; grid-template-columns: 100px 1fr; gap: 0.5rem;">
                                            <div class="ef-form-group" style="margin-bottom: 0;">
                                                <label style="font-size: 0.75rem; margin-bottom: 0.25rem;">${pollType}</label>
                                                <input type="text" class="ef-form-control" data-poll-value placeholder="${pollType === 'Rating' ? '⭐⭐' : pollType === 'Emoji' ? '😊' : 'Option'}">
                                            </div>
                                            <div class="ef-form-group" style="margin-bottom: 0;">
                                                <label style="font-size: 0.75rem; margin-bottom: 0.25rem;">Label</label>
                                                <input type="text" class="ef-form-control" data-poll-label placeholder="Label...">
                                            </div>
                                        </div>`;
                    pollContainer.appendChild(newOption);
                });
            }

            // TAMBAHKAN setelah divider events (atau di akhir method):
            // Image block tab switching
            const urlTab = container.querySelector('#ef-image-tab-url');
            const fileTab = container.querySelector('#ef-image-tab-file');
            const urlSection = container.querySelector('#ef-image-url-section');
            const fileSection = container.querySelector('#ef-image-file-section');

            if (urlTab && fileTab && urlSection && fileSection) {
                urlTab.addEventListener('click', () => {
                    urlTab.classList.add('ef-btn-secondary');
                    urlTab.style.background = '';
                    fileTab.classList.remove('ef-btn-secondary');
                    fileTab.style.background = 'rgba(255,255,255,0.1)';
                    urlSection.style.display = 'block';
                    fileSection.style.display = 'none';
                });

                fileTab.addEventListener('click', () => {
                    fileTab.classList.add('ef-btn-secondary');
                    fileTab.style.background = '';
                    urlTab.classList.remove('ef-btn-secondary');
                    urlTab.style.background = 'rgba(255,255,255,0.1)';
                    fileSection.style.display = 'block';
                    urlSection.style.display = 'none';
                });
            }

            // Image file upload handler
            const imageFileInput = container.querySelector('#ef-image-file');
            if (imageFileInput) {
                imageFileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const base64 = event.target.result;
                            // Set to URL input
                            const urlInput = container.querySelector('#ef-image-url');
                            if (urlInput) urlInput.value = base64;

                            // Show preview
                            const preview = container.querySelector('#ef-image-preview');
                            const previewImg = preview ? preview.querySelector('img') : null;
                            if (preview && previewImg) {
                                previewImg.src = base64;
                                preview.style.display = 'block';
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
        }

        // PART 4 - Save Edit & HTML Generation
        // Paste setelah attachEditFormEvents() di Part 3

        saveEdit() {
            if (this.currentEditIndex === -1 || this.currentEditIndex >= this.data.length) {
                this.closeModal();
                return;
            }

            const block = this.data[this.currentEditIndex];
            if (!block || !block.tag) {
                this.closeModal();
                return;
            }

            const modal = document.querySelector(`#ef-modals-${this.instanceId} #ef-modal-edit`);

            // GENERAL COMPONENTS
            if (block.tag === 'h2' || block.tag === 'h3' || block.tag === 'h4' || (block.tag === 'p' && !block.type) || block.type === 'code-block') {
                const textarea = modal.querySelector('#ef-edit-text');
                if (textarea) block.text = textarea.value;
            } else if (block.tag === 'ol' || block.tag === 'ul') {
                const items = [...modal.querySelectorAll('[data-list-item]')].map(input => input.value.trim()).filter(v => v);
                block.text = items.join('\n');
            }

            // DIVIDERS
            else if (block.type === 'divider-text') {
                const text = modal.querySelector('#ef-divider-text');
                if (text) block.text = text.value.trim();
            }

            // PREMIUM COMPONENTS
            else if (block.type === 'image') {
                const url = modal.querySelector('#ef-image-url');
                const title = modal.querySelector('#ef-image-title');
                const caption = modal.querySelector('#ef-image-caption');
                if (url && title && caption) {
                    block.text = url.value.trim() + '|' + title.value.trim() + '|' + caption.value.trim();
                }
            } else if (block.type === 'embed') {
                const embedType = modal.querySelector('#ef-embed-type');
                const url = modal.querySelector('#ef-embed-url');
                const caption = modal.querySelector('#ef-embed-caption');
                if (embedType && url && caption) {
                    block.text = embedType.value + '|' + url.value.trim() + '|' + caption.value.trim();
                }
            } else if (block.type === 'tip-info' || block.type === 'tip-success' || block.type === 'tip-warning' ||
                block.type === 'tip-danger' || block.type === 'tip-note' || block.type === 'tip-question' ||
                block.type === 'tip-star' || block.type === 'tip-check') {
                const title = modal.querySelector('#ef-tip-title');
                const content = modal.querySelector('#ef-tip-content');
                if (title && content) block.text = title.value + '\n' + content.value;
            } else if (block.type === 'tip-quote') {
                const title = modal.querySelector('#ef-tip-title');
                const content = modal.querySelector('#ef-tip-content');
                const author = modal.querySelector('#ef-quote-author');
                if (title && content && author) block.text = title.value + '\n' + content.value + '\n' + author.value;
            } else if (block.type === 'tip-steps') {
                const title = modal.querySelector('#ef-tip-title');
                const steps = [...modal.querySelectorAll('[data-step-item]')].map(input => input.value.trim()).filter(v => v);
                if (title) block.text = title.value + '\n' + steps.join('\n');
            } else if (block.type === 'card-basic' || block.type === 'card-hover' || block.type === 'card-bordered' || block.type === 'card-gradient') {
                const title = modal.querySelector('#ef-card-title');
                const content = modal.querySelector('#ef-card-content');
                if (title && content) block.text = title.value + '\n' + content.value;
            } else if (block.type === 'card-image') {
                const imageUrl = modal.querySelector('#ef-card-image');
                const title = modal.querySelector('#ef-card-title');
                const content = modal.querySelector('#ef-card-content');
                if (imageUrl && title && content) block.text = title.value + '\n' + content.value + '\n' + imageUrl.value;
            } else if (block.type === 'card-icon-top') {
                const icon = modal.querySelector('#ef-card-icon');
                const title = modal.querySelector('#ef-card-title');
                const content = modal.querySelector('#ef-card-content');
                if (icon && title && content) block.text = icon.value + '\n' + title.value + '\n' + content.value;
            } else if (block.type === 'card-stat') {
                const number = modal.querySelector('#ef-stat-number');
                const label = modal.querySelector('#ef-stat-label');
                const desc = modal.querySelector('#ef-stat-desc');
                if (number && label && desc) block.text = number.value + '|' + label.value + '\n' + desc.value;
            } else if (block.type === 'card-grid-2col' || block.type === 'card-grid-3col') {
                const cards = [];
                const cardItems = modal.querySelectorAll('.ef-card-grid-item');
                cardItems.forEach(item => {
                    const title = item.querySelector('[data-card-title]');
                    const icon = item.querySelector('[data-card-icon]');
                    const content = item.querySelector('[data-card-content]');
                    if (title && icon && content) {
                        cards.push(`${title.value.trim()}|${icon.value.trim()}|${content.value.trim()}`);
                    }
                });
                block.text = cards.join('\n');
            } else if (block.type === 'card-grid-masonry') {
                const cards = [];
                const cardItems = modal.querySelectorAll('.ef-card-grid-item');
                cardItems.forEach(item => {
                    const title = item.querySelector('[data-card-title]');
                    const icon = item.querySelector('[data-card-icon]');
                    const size = item.querySelector('[data-card-size]');
                    const content = item.querySelector('[data-card-content]');
                    if (title && icon && size && content) {
                        cards.push(`${title.value.trim()}|${icon.value.trim()}|${size.value}|${content.value.trim()}`);
                    }
                });
                block.text = cards.join('\n');
            } else if (block.type === 'cta-center' || block.type === 'cta-split' || block.type === 'cta-urgent') {
                const title = modal.querySelector('#ef-cta-title');
                const desc = modal.querySelector('#ef-cta-desc');
                const buttons = [];
                const btnItems = modal.querySelectorAll('.ef-cta-button-item');
                btnItems.forEach(item => {
                    const text = item.querySelector('[data-btn-text]');
                    const url = item.querySelector('[data-btn-url]');
                    if (text && url && text.value.trim()) buttons.push(`${text.value.trim()}|${url.value.trim()}`);
                });
                if (title && desc) block.text = title.value + '\n' + desc.value + '\n' + buttons.join('\n');
            } else if (block.type === 'cta-minimal') {
                const title = modal.querySelector('#ef-cta-title');
                const desc = modal.querySelector('#ef-cta-desc');
                const btnText = modal.querySelector('#ef-cta-btn-text');
                const btnUrl = modal.querySelector('#ef-cta-btn-url');
                if (title && desc && btnText && btnUrl) {
                    block.text = title.value + '\n' + desc.value + '\n' + btnText.value + '|' + btnUrl.value;
                }
            } else if (block.type === 'cta-newsletter') {
                const title = modal.querySelector('#ef-cta-title');
                const desc = modal.querySelector('#ef-cta-desc');
                const placeholder = modal.querySelector('#ef-newsletter-placeholder');
                const btnText = modal.querySelector('#ef-cta-btn-text');
                const btnUrl = modal.querySelector('#ef-cta-btn-url');
                if (title && desc && placeholder && btnText && btnUrl) {
                    block.text = title.value + '\n' + desc.value + '\n' + placeholder.value + '\n' + btnText.value + '|' + btnUrl.value;
                }
            } else if (block.type === 'table-basic' || block.type === 'table-striped' || block.type === 'table-comparison') {
                const rows = [];
                const rowElements = modal.querySelectorAll('.ef-table-row');
                rowElements.forEach(row => {
                    const cells = [];
                    const cellInputs = row.querySelectorAll('[data-table-cell]');
                    cellInputs.forEach(input => cells.push(input.value.trim()));
                    if (cells.length > 0 && cells.some(c => c)) rows.push(cells.join('|'));
                });
                block.text = rows.join('\n');
            } else if (block.type === 'timeline-vertical' || block.type === 'timeline-horizontal') {
                const items = [];
                const itemElements = modal.querySelectorAll('.ef-timeline-item');
                itemElements.forEach(item => {
                    const date = item.querySelector('[data-timeline-date]');
                    const title = item.querySelector('[data-timeline-title]');
                    const desc = item.querySelector('[data-timeline-desc]');
                    if (date && title && desc) {
                        items.push(`${date.value.trim()}|${title.value.trim()}|${desc.value.trim()}`);
                    }
                });
                block.text = items.join('\n');
            } else if (block.type === 'accordion-faq' || block.type === 'accordion-simple') {
                const items = [];
                const itemElements = modal.querySelectorAll('.ef-accordion-item');
                itemElements.forEach(item => {
                    const question = item.querySelector('[data-accordion-question]');
                    const answer = item.querySelector('[data-accordion-answer]');
                    if (question && answer) {
                        items.push(`${question.value.trim()}|${answer.value.trim()}`);
                    }
                });
                block.text = items.join('\n');
            } else if (block.type === 'poll-emoji' || block.type === 'poll-rating' || block.type === 'poll-vote') {
                const question = modal.querySelector('#ef-poll-question');
                const options = [];
                const optionElements = modal.querySelectorAll('.ef-poll-option-item');
                optionElements.forEach(item => {
                    const value = item.querySelector('[data-poll-value]');
                    const label = item.querySelector('[data-poll-label]');
                    if (value && label && value.value.trim() && label.value.trim()) {
                        options.push(value.value.trim() + '|' + label.value.trim());
                    }
                });
                if (question) {
                    block.text = question.value + '|' + options.join('|');
                }
            }

            this.renderCanvas();
            this.closeModal();
            if (this.options.onChange) this.options.onChange(this.generateHTML(true));
        }

        // ============================================
        // PREVIEW & EXPORT
        // ============================================
        showPreview() {
            const modal = document.body.querySelector(`#ef-modals-${this.instanceId} #ef-modal-preview`);
            if (!modal) return;
            const content = modal.querySelector('#ef-preview-content');
            content.innerHTML = this.generatePreviewHTML();
            this.applyContentTheme(content);
            modal.classList.add('ef-modal-active');
            document.body.classList.add('ef-modal-open');
        }

        showJSON() {
            const modal = document.body.querySelector(`#ef-modals-${this.instanceId} #ef-modal-code`);
            if (!modal) return;
            const title = modal.querySelector('#ef-code-title');
            const content = modal.querySelector('#ef-code-content');
            title.textContent = 'JSON Export';
            const jsonData = {
                editorTheme: this.currentEditorTheme,
                contentTheme: this.currentContentTheme,
                isPremium: this.isPremium,
                content: this.data
            };
            content.textContent = JSON.stringify(jsonData, null, 2);
            modal.classList.add('ef-modal-active');
            document.body.classList.add('ef-modal-open');
        }

        showHTML() {
            const modal = document.body.querySelector(`#ef-modals-${this.instanceId} #ef-modal-code`);
            if (!modal) return;
            const title = modal.querySelector('#ef-code-title');
            const content = modal.querySelector('#ef-code-content');
            title.textContent = 'HTML Export';
            content.textContent = this.generateHTML(true);
            modal.classList.add('ef-modal-active');
            document.body.classList.add('ef-modal-open');
        }

        showImport() {
            const importData = prompt('Paste JSON data:');
            if (importData) {
                const success = this.import(importData);
                if (success) {
                    alert('Import berhasil!');
                } else {
                    alert('Import gagal. Pastikan format JSON benar.');
                }
            }
        }

        toggleLivePreview() {
            this.livePreviewActive = !this.livePreviewActive;
            const editorBody = this.container.querySelector('.ef-editor-body');
            const toggleBtn = this.container.querySelector('[data-action="toggle-live-preview"]');

            if (this.livePreviewActive) {
                editorBody.classList.add('ef-with-live-preview');
                toggleBtn.classList.add('ef-btn-active');
                toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Live Preview';

                const livePreview = document.createElement('div');
                livePreview.className = 'ef-live-preview';
                livePreview.innerHTML = `
                    <div class="ef-live-preview-header">
                        <h3><i class="fas fa-eye"></i> Live Preview</h3>
                    </div>
                    <div class="ef-live-preview-content"></div>
                `;

                const canvas = editorBody.querySelector('.ef-canvas');
                editorBody.insertBefore(livePreview, canvas);
                this.updateLivePreview();
            } else {
                editorBody.classList.remove('ef-with-live-preview');
                toggleBtn.classList.remove('ef-btn-active');
                toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Live Preview';

                const livePreview = editorBody.querySelector('.ef-live-preview');
                if (livePreview) livePreview.remove();
            }
        }

        updateLivePreview() {
            if (!this.livePreviewActive) return;
            const livePreviewContent = this.container.querySelector('.ef-live-preview-content');
            if (!livePreviewContent) return;
            livePreviewContent.innerHTML = this.generateHTML(true);
            this.applyContentTheme(livePreviewContent);
        }

        copyCode() {
            const modal = document.querySelector(`#ef-modals-${this.instanceId} #ef-modal-code`);
            if (!modal) return;
            const content = modal.querySelector('#ef-code-content');
            if (!content) return;
            const text = content.textContent;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    this.showCopySuccess();
                }).catch(() => {
                    this.copyCodeFallback(text);
                });
            } else {
                this.copyCodeFallback(text);
            }
        }

        copyCodeFallback(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                this.showCopySuccess();
            } catch (err) {
                alert('Failed to copy');
            }
            document.body.removeChild(textarea);
        }

        showCopySuccess() {
            const modal = document.querySelector(`#ef-modals-${this.instanceId} #ef-modal-code`);
            if (!modal) return;
            const btn = modal.querySelector('[data-action="copy-code"]');
            if (!btn) return;

            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            btn.style.background = 'rgba(34, 197, 94, 0.8)';
            btn.disabled = true;

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '';
                btn.disabled = false;
            }, 2000);
        }

        closeModal() {
            const activeModals = document.body.querySelectorAll(`#ef-modals-${this.instanceId} .ef-modal.ef-modal-active`);
            activeModals.forEach(modal => {
                modal.classList.add('ef-modal-closing');
                setTimeout(() => {
                    modal.classList.remove('ef-modal-active', 'ef-modal-closing');
                    document.body.classList.remove('ef-modal-open');
                }, 300);
            });
        }

        // Lanjut ke generatePreviewHTML() di Part 5 (file terpisah karena sangat panjang)...

        // Utility
        escapeHtml(text) {
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
            return text.replace(/[&<>"']/g, m => map[m]);
        }

        // Public API
        export(format = 'json') {
            if (format === 'json') {
                return JSON.stringify({
                    editorTheme: this.currentEditorTheme,
                    contentTheme: this.currentContentTheme,
                    isPremium: this.isPremium,
                    content: this.data
                }, null, 2);
            } else if (format === 'html') {
                return this.generateHTML(true);
            }
            return this.data;
        }

        import(data) {
            try {
                if (typeof data === 'string') {
                    const trimmed = data.trim();
                    if (trimmed.startsWith('<') || trimmed.startsWith('<!')) {
                        // Parse HTML
                        const success = this.importHTML(data);
                        if (success) {
                            this.updateHiddenInput();  // ADD: Sync textarea
                        }
                        return success;
                    } else {
                        // Parse JSON
                        data = JSON.parse(data);
                    }
                }

                if (data.editorTheme) this.setEditorTheme(data.editorTheme);
                if (data.contentTheme) this.setContentTheme(data.contentTheme);
                if (data.content && Array.isArray(data.content)) {
                    this.data = data.content;
                } else if (Array.isArray(data)) {
                    this.data = data;
                }
                this.renderCanvas();  // This now auto-syncs textarea
                if (this.options.onChange) this.options.onChange(this.data);
                return true;
            } catch (error) {
                console.error('EfArticleBuilder: Import failed', error);
                return false;
            }
        }

        importHTML(html) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Cari container utama
                let container = doc.querySelector('.ef-preview-container, .ef-article-content');
                if (!container) {
                    // Jika tidak ada container, anggap body sebagai container
                    container = doc.body;
                }

                // Extract theme dari inline styles jika ada
                if (container.style.cssText) {
                    this.extractThemeFromStyles(container.style.cssText);
                }

                // Parse children
                const blocks = [];
                const children = Array.from(container.children);

                children.forEach(element => {
                    const block = this.parseHTMLElement(element);
                    if (block) blocks.push(block);
                });

                this.data = blocks;
                this.renderCanvas();
                if (this.options.onChange) this.options.onChange(this.data);
                return true;
            } catch (error) {
                console.error('EfArticleBuilder: HTML import failed', error);
                return false;
            }
        }

        extractThemeFromStyles(cssText) {
            // Extract CSS variables dari inline style
            const vars = {};
            const matches = cssText.matchAll(/--ef-([^:]+):\s*([^;]+)/g);

            for (const match of matches) {
                const key = `--ef-${match[1].trim()}`;
                const value = match[2].trim();
                vars[key] = value;
            }

            if (Object.keys(vars).length > 0) {
                // Coba deteksi theme yang cocok
                let detectedTheme = null;
                for (const [themeName, themeVars] of Object.entries(this.contentThemes)) {
                    if (this.compareThemes(vars, themeVars)) {
                        detectedTheme = themeName;
                        break;
                    }
                }

                if (detectedTheme) {
                    this.setContentTheme(detectedTheme);
                } else {
                    // Custom theme
                    this.setContentTheme(vars);
                }
            }
        }

        compareThemes(theme1, theme2) {
            const keys1 = Object.keys(theme1);
            const keys2 = Object.keys(theme2);

            if (keys1.length !== keys2.length) return false;

            return keys1.every(key => theme1[key] === theme2[key]);
        }

        parseHTMLElement(element) {
            const tagName = element.tagName.toLowerCase();

            // Headings
            if (tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
                return {
                    tag: tagName,
                    text: element.textContent.trim(),
                    class: '',
                    layout: 'column'
                };
            }

            // Paragraph
            if (tagName === 'p') {
                return {
                    tag: 'p',
                    text: element.textContent.trim(),
                    class: element.className || '',
                    layout: 'column'
                };
            }

            // Lists
            if (tagName === 'ol' || tagName === 'ul') {
                const items = Array.from(element.querySelectorAll('li'))
                    .map(li => li.textContent.trim());
                return {
                    tag: tagName,
                    text: items.join('\n'),
                    class: '',
                    layout: 'column'
                };
            }

            // Code block
            if (tagName === 'pre' && element.classList.contains('ef-code-block')) {
                const code = element.querySelector('code');
                return {
                    tag: 'div',
                    type: 'code-block',
                    text: code ? code.textContent : element.textContent,
                    class: '',
                    layout: 'column'
                };
            }

            // Dividers
            if (tagName === 'div' && element.classList.contains('ef-divider')) {
                if (element.classList.contains('ef-divider-line')) {
                    return { tag: 'div', type: 'divider-line', text: '', class: '', layout: 'column' };
                } else if (element.classList.contains('ef-divider-dashed')) {
                    return { tag: 'div', type: 'divider-dashed', text: '', class: '', layout: 'column' };
                } else if (element.classList.contains('ef-divider-dotted')) {
                    return { tag: 'div', type: 'divider-dotted', text: '', class: '', layout: 'column' };
                } else if (element.classList.contains('ef-divider-gradient')) {
                    return { tag: 'div', type: 'divider-gradient', text: '', class: '', layout: 'column' };
                } else if (element.classList.contains('ef-divider-text')) {
                    return { tag: 'div', type: 'divider-text', text: element.textContent.trim(), class: '', layout: 'column' };
                }
            }

            // Image block
            if (tagName === 'figure' && element.classList.contains('ef-image-block')) {
                const img = element.querySelector('img');
                const caption = element.querySelector('figcaption');
                return {
                    tag: 'div',
                    type: 'image',
                    text: `${img?.src || ''}|${img?.alt || ''}|${caption?.textContent.trim() || ''}`,
                    class: '',
                    layout: 'column'
                };
            }

            // Embed block
            if (tagName === 'div' && element.classList.contains('ef-embed-block')) {
                const iframe = element.querySelector('iframe');
                const caption = element.querySelector('.ef-embed-caption');
                const src = iframe?.src || '';

                // Detect embed type
                let embedType = 'iframe';
                if (src.includes('youtube.com')) embedType = 'youtube';
                else if (src.includes('vimeo.com')) embedType = 'vimeo';

                return {
                    tag: 'div',
                    type: 'embed',
                    text: `${embedType}|${src}|${caption?.textContent.trim() || ''}`,
                    class: '',
                    layout: 'column'
                };
            }

            // Tip blocks
            if (tagName === 'div' && element.classList.contains('ef-tip-block')) {
                const types = ['tip-info', 'tip-success', 'tip-warning', 'tip-danger', 'tip-note',
                    'tip-question', 'tip-star', 'tip-check', 'tip-quote', 'tip-steps'];

                for (const type of types) {
                    if (element.classList.contains(type)) {
                        if (type === 'tip-quote') {
                            const small = element.querySelector('small');
                            const blockquote = element.querySelector('blockquote');
                            const cite = element.querySelector('cite');
                            return {
                                tag: 'div',
                                type: 'tip-quote',
                                text: `${small?.textContent || 'Quote'}\n${blockquote?.textContent.trim() || ''}\n${cite?.textContent.replace('— ', '') || ''}`,
                                class: '',
                                layout: 'column'
                            };
                        } else if (type === 'tip-steps') {
                            const strong = element.querySelector('strong');
                            const steps = Array.from(element.querySelectorAll('ol li'))
                                .map(li => li.textContent.trim());
                            return {
                                tag: 'div',
                                type: 'tip-steps',
                                text: `${strong?.textContent || 'Quick Steps'}\n${steps.join('\n')}`,
                                class: '',
                                layout: 'column'
                            };
                        } else {
                            const strong = element.querySelector('strong');
                            const p = element.querySelector('p');
                            return {
                                tag: 'div',
                                type: type,
                                text: `${strong?.textContent || ''}\n${p?.textContent.trim() || ''}`,
                                class: '',
                                layout: 'column'
                            };
                        }
                    }
                }
            }

            // Cards
            if (tagName === 'div' && element.classList.contains('ef-card')) {
                if (element.classList.contains('ef-card-stat')) {
                    const number = element.querySelector('.ef-stat-number');
                    const label = element.querySelector('.ef-stat-label');
                    const desc = element.querySelector('.ef-stat-desc');
                    return {
                        tag: 'div',
                        type: 'card-stat',
                        text: `${number?.textContent || '0'}|${label?.textContent || ''}\n${desc?.textContent.trim() || ''}`,
                        class: '',
                        layout: 'column'
                    };
                } else if (element.classList.contains('ef-card-image')) {
                    const img = element.querySelector('img');
                    const h4 = element.querySelector('h4');
                    const p = element.querySelector('p');
                    return {
                        tag: 'div',
                        type: 'card-image',
                        text: `${h4?.textContent || ''}\n${p?.textContent.trim() || ''}\n${img?.src || ''}`,
                        class: '',
                        layout: 'column'
                    };
                } else if (element.classList.contains('ef-card-icon-top')) {
                    const icon = element.querySelector('.ef-card-icon-large i');
                    const h4 = element.querySelector('h4');
                    const p = element.querySelector('p');
                    return {
                        tag: 'div',
                        type: 'card-icon-top',
                        text: `${icon?.className || 'fas fa-star'}\n${h4?.textContent || ''}\n${p?.textContent.trim() || ''}`,
                        class: '',
                        layout: 'column'
                    };
                } else if (element.classList.contains('ef-card-hover')) {
                    const h4 = element.querySelector('h4');
                    const p = element.querySelector('p');
                    return {
                        tag: 'div',
                        type: 'card-hover',
                        text: `${h4?.textContent || ''}\n${p?.textContent.trim() || ''}`,
                        class: '',
                        layout: 'column'
                    };
                } else if (element.classList.contains('ef-card-bordered')) {
                    const h4 = element.querySelector('h4');
                    const p = element.querySelector('p');
                    return {
                        tag: 'div',
                        type: 'card-bordered',
                        text: `${h4?.textContent || ''}\n${p?.textContent.trim() || ''}`,
                        class: '',
                        layout: 'column'
                    };
                } else if (element.classList.contains('ef-card-gradient')) {
                    const h4 = element.querySelector('h4');
                    const p = element.querySelector('p');
                    return {
                        tag: 'div',
                        type: 'card-gradient',
                        text: `${h4?.textContent || ''}\n${p?.textContent.trim() || ''}`,
                        class: '',
                        layout: 'column'
                    };
                } else {
                    // Basic card
                    const h4 = element.querySelector('h4');
                    const p = element.querySelector('p');
                    return {
                        tag: 'div',
                        type: 'card-basic',
                        text: `${h4?.textContent || ''}\n${p?.textContent.trim() || ''}`,
                        class: '',
                        layout: 'column'
                    };
                }
            }

            // Card grids
            if (tagName === 'div' && element.classList.contains('ef-card-grid')) {
                if (element.classList.contains('ef-card-grid-2col')) {
                    const cards = Array.from(element.querySelectorAll('.ef-card')).map(card => {
                        const icon = card.querySelector('.ef-card-icon i');
                        const h4 = card.querySelector('h4');
                        const p = card.querySelector('p');
                        return `${h4?.textContent || ''}|${icon?.className || 'fas fa-star'}|${p?.textContent.trim() || ''}`;
                    });
                    return {
                        tag: 'div',
                        type: 'card-grid-2col',
                        text: cards.join('\n'),
                        class: '',
                        layout: 'row'
                    };
                } else if (element.classList.contains('ef-card-grid-3col')) {
                    const cards = Array.from(element.querySelectorAll('.ef-card')).map(card => {
                        const icon = card.querySelector('.ef-card-icon i');
                        const h4 = card.querySelector('h4');
                        const p = card.querySelector('p');
                        return `${h4?.textContent || ''}|${icon?.className || 'fas fa-star'}|${p?.textContent.trim() || ''}`;
                    });
                    return {
                        tag: 'div',
                        type: 'card-grid-3col',
                        text: cards.join('\n'),
                        class: '',
                        layout: 'row'
                    };
                } else if (element.classList.contains('ef-card-grid-masonry')) {
                    const cards = Array.from(element.querySelectorAll('.ef-card')).map(card => {
                        const icon = card.querySelector('.ef-card-icon i');
                        const h4 = card.querySelector('h4');
                        const p = card.querySelector('p');

                        // Detect size from class
                        let size = 'medium';
                        if (card.classList.contains('ef-card-short')) size = 'short';
                        else if (card.classList.contains('ef-card-long')) size = 'long';

                        return `${h4?.textContent || ''}|${icon?.className || 'fas fa-star'}|${size}|${p?.textContent.trim() || ''}`;
                    });
                    return {
                        tag: 'div',
                        type: 'card-grid-masonry',
                        text: cards.join('\n'),
                        class: '',
                        layout: 'row'
                    };
                }
            }

            // CTA blocks
            if (tagName === 'div' && element.classList.contains('ef-cta-block')) {
                const h3 = element.querySelector('h3');
                const p = element.querySelector('p');
                const buttons = Array.from(element.querySelectorAll('.ef-cta-btn')).map(btn =>
                    `${btn.textContent.trim()}|${btn.getAttribute('href') || '#'}`
                );

                if (element.classList.contains('ef-cta-newsletter')) {
                    const input = element.querySelector('.ef-newsletter-input');
                    const form = element.querySelector('.ef-newsletter-form');
                    return {
                        tag: 'div',
                        type: 'cta-newsletter',
                        text: `${h3?.textContent || ''}\n${p?.textContent.trim() || ''}\n${input?.placeholder || 'your@email.com'}\n${buttons[0] || 'Subscribe|#subscribe'}`,
                        class: '',
                        layout: 'column'
                    };
                } else if (element.classList.contains('ef-cta-minimal')) {
                    return {
                        tag: 'div',
                        type: 'cta-minimal',
                        text: `${h3?.textContent || ''}\n${p?.textContent.trim() || ''}\n${buttons[0] || ''}`,
                        class: '',
                        layout: 'column'
                    };
                } else if (element.classList.contains('ef-cta-urgent')) {
                    return {
                        tag: 'div',
                        type: 'cta-urgent',
                        text: `${h3?.textContent || ''}\n${p?.textContent.trim() || ''}\n${buttons.join('\n')}`,
                        class: '',
                        layout: 'column'
                    };
                } else if (element.classList.contains('ef-cta-split')) {
                    return {
                        tag: 'div',
                        type: 'cta-split',
                        text: `${h3?.textContent || ''}\n${p?.textContent.trim() || ''}\n${buttons.join('\n')}`,
                        class: '',
                        layout: 'column'
                    };
                } else {
                    // Default: cta-center
                    return {
                        tag: 'div',
                        type: 'cta-center',
                        text: `${h3?.textContent || ''}\n${p?.textContent.trim() || ''}\n${buttons.join('\n')}`,
                        class: '',
                        layout: 'column'
                    };
                }
            }

            // Tables
            if (tagName === 'table' && element.classList.contains('ef-table')) {
                const rows = [];
                const headerCells = Array.from(element.querySelectorAll('thead th'))
                    .map(th => th.textContent.trim());
                if (headerCells.length > 0) {
                    rows.push(headerCells.join('|'));
                }

                const bodyRows = Array.from(element.querySelectorAll('tbody tr'));
                bodyRows.forEach(tr => {
                    const cells = Array.from(tr.querySelectorAll('td'))
                        .map(td => td.textContent.trim());
                    rows.push(cells.join('|'));
                });

                let type = 'table-basic';
                if (element.classList.contains('ef-table-striped')) type = 'table-striped';
                else if (element.classList.contains('ef-table-comparison')) type = 'table-comparison';

                return {
                    tag: 'table',
                    type: type,
                    text: rows.join('\n'),
                    class: '',
                    layout: 'column'
                };
            }

            // Timeline
            if (tagName === 'div' && element.classList.contains('ef-timeline')) {
                const items = Array.from(element.querySelectorAll('.ef-timeline-item')).map(item => {
                    const date = item.querySelector('.ef-timeline-date');
                    const h4 = item.querySelector('h4');
                    const p = item.querySelector('p');
                    return `${date?.textContent.trim() || ''}|${h4?.textContent || ''}|${p?.textContent.trim() || ''}`;
                });

                const type = element.classList.contains('ef-timeline-horizontal')
                    ? 'timeline-horizontal'
                    : 'timeline-vertical';

                return {
                    tag: 'div',
                    type: type,
                    text: items.join('\n'),
                    class: '',
                    layout: type === 'timeline-horizontal' ? 'row' : 'column'
                };
            }

            // Accordion
            if (tagName === 'div' && element.classList.contains('ef-accordion')) {
                const items = Array.from(element.querySelectorAll('.ef-accordion-item')).map(item => {
                    const header = item.querySelector('.ef-accordion-header span');
                    const content = item.querySelector('.ef-accordion-content p');
                    return `${header?.textContent.trim() || ''}|${content?.textContent.trim() || ''}`;
                });

                const type = element.classList.contains('ef-accordion-faq')
                    ? 'accordion-faq'
                    : 'accordion-simple';

                return {
                    tag: 'div',
                    type: type,
                    text: items.join('\n'),
                    class: '',
                    layout: 'column'
                };
            }

            // Polls
            if (tagName === 'div' && element.classList.contains('ef-poll')) {
                const question = element.querySelector('.ef-poll-question');
                const options = Array.from(element.querySelectorAll('.ef-poll-option')).map(opt => {
                    const value = opt.querySelector('.ef-poll-option-value');
                    const label = opt.querySelector('.ef-poll-option-label');
                    return `${value?.textContent.trim() || ''}|${label?.textContent.trim() || ''}`;
                });

                let type = 'poll-vote';
                if (element.classList.contains('ef-poll-emoji')) type = 'poll-emoji';
                else if (element.classList.contains('ef-poll-rating')) type = 'poll-rating';

                return {
                    tag: 'div',
                    type: type,
                    text: `${question?.textContent.trim() || ''}|${options.join('|')}`,
                    class: '',
                    layout: 'column'
                };
            }

            return null;
        }

        getData() {
            return this.data;
        }

        destroy() {
            this.container.innerHTML = '';
            const modalContainer = document.getElementById(`#ef-modals-${this.instanceId}`);
            if (modalContainer) modalContainer.remove();
            activeEditors.delete(this.instanceId);
            document.body.classList.remove('ef-modal-open');
        }

        // PART 5 FINAL - HTML Generation Methods & Class Closing
        // Paste setelah destroy() di Part 4
        // WARNING: File ini SANGAT PANJANG (1000+ lines) karena render semua komponen

        generatePreviewHTML() {
            let html = '';
            this.data.forEach(block => {
                html += this.renderBlock(block);
            });
            return html;
        }

        generateHTML(withWrapper = false) {
            let html = '';
            this.data.forEach(block => {
                html += this.renderBlock(block);
            });

            if (withWrapper) {
                const themeVars = this.customContentTheme || this.contentThemes[this.currentContentTheme] || this.contentThemes.glassmorphism;
                const styleVars = Object.entries(themeVars).map(([key, value]) => `${key}: ${value}`).join('; ');
                return `<div class="ef-preview-container" style="${styleVars}">\n${html}</div>`;
            }
            return html;
        }

        renderBlock(block) {
            // GENERAL COMPONENTS
            if (block.tag === 'h2' || block.tag === 'h3' || block.tag === 'h4') {
                return `  <${block.tag}>${this.escapeHtml(block.text)}</${block.tag}>\n`;
            }

            if (block.tag === 'p') {
                const cls = block.class ? ` class="${block.class}"` : '';
                return `  <p${cls}>${this.escapeHtml(block.text)}</p>\n`;
            }

            if (block.tag === 'ol' || block.tag === 'ul') {
                const items = block.text.split('\n').filter(i => i.trim());
                let html = `  <${block.tag}>\n`;
                items.forEach(item => html += `    <li>${this.escapeHtml(item)}</li>\n`);
                html += `  </${block.tag}>\n`;
                return html;
            }

            if (block.type === 'code-block') {
                return `  <pre class="ef-code-block"><code>${this.escapeHtml(block.text)}</code></pre>\n`;
            }

            // DIVIDERS
            if (block.type === 'divider-line' || block.type === 'divider-dashed' ||
                block.type === 'divider-dotted' || block.type === 'divider-gradient') {
                return `  <div class="ef-divider ef-${block.type}"></div>\n`;
            }

            if (block.type === 'divider-text') {
                const text = block.text || '* * *';
                return `  <div class="ef-divider ef-divider-text">${this.escapeHtml(text)}</div>\n`;
            }

            // PREMIUM: IMAGE & EMBED
            if (block.type === 'image') {
                const parts = block.text.split('|');
                const imageUrl = parts[0] || '';
                const title = parts[1] || 'Image';
                const caption = parts[2] || '';
                let html = `  <figure class="ef-image-block">\n    <img src="${this.escapeHtml(imageUrl)}" alt="${this.escapeHtml(title)}" class="ef-image">\n`;
                if (caption) {
                    html += `    <figcaption class="ef-image-caption">${this.escapeHtml(caption)}</figcaption>\n`;
                }
                html += `  </figure>\n`;
                return html;
            }

            if (block.type === 'embed') {
                const parts = block.text.split('|');
                const embedType = parts[0] || 'youtube';
                const url = parts[1] || '';
                const caption = parts[2] || '';

                let embedUrl = '';
                if (embedType === 'youtube') {
                    let videoId = '';
                    if (url.includes('youtube.com/watch?v=')) {
                        videoId = url.split('v=')[1].split('&')[0];
                    } else if (url.includes('youtu.be/')) {
                        videoId = url.split('youtu.be/')[1].split('?')[0];
                    } else if (url.includes('youtube.com/embed/')) {
                        videoId = url.split('embed/')[1];
                    }
                    embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : url;
                } else if (embedType === 'vimeo') {
                    const vimeoId = url.split('/').pop();
                    embedUrl = `https://player.vimeo.com/video/${vimeoId}`;
                } else {
                    embedUrl = url;
                }

                let html = `  <div class="ef-embed-block">\n    <div class="ef-embed-container">\n      <iframe src="${this.escapeHtml(embedUrl)}" frameborder="0" allowfullscreen></iframe>\n    </div>\n`;
                if (caption) {
                    html += `    <div class="ef-embed-caption">${this.escapeHtml(caption)}</div>\n`;
                }
                html += `  </div>\n`;
                return html;
            }

            // PREMIUM: TIP BLOCKS
            if (block.type === 'tip-info' || block.type === 'tip-success' || block.type === 'tip-warning' ||
                block.type === 'tip-danger' || block.type === 'tip-note' || block.type === 'tip-question' ||
                block.type === 'tip-star' || block.type === 'tip-check') {
                const lines = block.text.split('\n');
                const title = lines[0] || '';
                const content = lines.slice(1).join(' ').trim();
                const iconMap = {
                    'tip-info': 'info-circle', 'tip-success': 'check-circle', 'tip-warning': 'exclamation-triangle',
                    'tip-danger': 'exclamation-circle', 'tip-note': 'sticky-note', 'tip-question': 'question-circle',
                    'tip-star': 'star', 'tip-check': 'check-square'
                };
                const icon = iconMap[block.type] || 'lightbulb';
                return `  <div class="ef-tip-block ef-${block.type}">\n    <div class="ef-tip-icon"><i class="fas fa-${icon}"></i></div>\n    <div class="ef-tip-content">\n      <strong>${this.escapeHtml(title)}</strong>\n      <p>${this.escapeHtml(content)}</p>\n    </div>\n  </div>\n`;
            }

            if (block.type === 'tip-quote') {
                const lines = block.text.split('\n');
                const label = lines[0] || 'Quote';
                const content = lines[1] || '';
                const author = lines[2] || '';
                return `  <div class="ef-tip-block ef-tip-quote">\n    <div class="ef-tip-icon"><i class="fas fa-quote-left"></i></div>\n    <div class="ef-tip-content">\n      ${label !== 'Quote' ? `<small>${this.escapeHtml(label)}</small>\n      ` : ''}<blockquote>${this.escapeHtml(content)}</blockquote>\n      ${author ? `<cite>— ${this.escapeHtml(author)}</cite>` : ''}\n    </div>\n  </div>\n`;
            }

            if (block.type === 'tip-steps') {
                const lines = block.text.split('\n');
                const title = lines[0] || 'Quick Steps';
                const steps = lines.slice(1).filter(s => s.trim());
                let html = `  <div class="ef-tip-block ef-tip-steps">\n    <div class="ef-tip-icon"><i class="fas fa-list-ol"></i></div>\n    <div class="ef-tip-content">\n      <strong>${this.escapeHtml(title)}</strong>\n      <ol class="ef-steps-list">\n`;
                steps.forEach(step => html += `        <li>${this.escapeHtml(step)}</li>\n`);
                html += `      </ol>\n    </div>\n  </div>\n`;
                return html;
            }

            // PREMIUM: CARDS
            if (block.type === 'card-basic') {
                const lines = block.text.split('\n');
                const title = lines[0] || '';
                const content = lines.slice(1).join(' ').trim();
                return `  <div class="ef-card ef-card-basic">\n    <h4>${this.escapeHtml(title)}</h4>\n    <p>${this.escapeHtml(content)}</p>\n  </div>\n`;
            }

            if (block.type === 'card-image') {
                const lines = block.text.split('\n');
                const title = lines[0] || '';
                const content = lines[1] || '';
                const imageUrl = lines[2] || '';
                return `  <div class="ef-card ef-card-image">\n    <img src="${this.escapeHtml(imageUrl)}" alt="${this.escapeHtml(title)}" class="ef-card-img">\n    <div class="ef-card-body">\n      <h4>${this.escapeHtml(title)}</h4>\n      <p>${this.escapeHtml(content)}</p>\n    </div>\n  </div>\n`;
            }

            if (block.type === 'card-icon-top') {
                const lines = block.text.split('\n');
                const icon = lines[0] || 'fas fa-star';
                const title = lines[1] || '';
                const content = lines[2] || '';
                return `  <div class="ef-card ef-card-icon-top">\n    <div class="ef-card-icon-large"><i class="${this.escapeHtml(icon)}"></i></div>\n    <h4>${this.escapeHtml(title)}</h4>\n    <p>${this.escapeHtml(content)}</p>\n  </div>\n`;
            }

            if (block.type === 'card-hover' || block.type === 'card-bordered' || block.type === 'card-gradient') {
                const lines = block.text.split('\n');
                const title = lines[0] || '';
                const content = lines.slice(1).join(' ').trim();
                return `  <div class="ef-card ef-${block.type}">\n    <h4>${this.escapeHtml(title)}</h4>\n    <p>${this.escapeHtml(content)}</p>\n  </div>\n`;
            }

            if (block.type === 'card-stat') {
                const lines = block.text.split('\n');
                const parts = lines[0].split('|');
                const number = parts[0] || '0';
                const label = parts[1] || '';
                const description = lines.slice(1).join(' ').trim();
                return `  <div class="ef-card ef-card-stat">\n    <div class="ef-stat-number">${this.escapeHtml(number)}</div>\n    <div class="ef-stat-label">${this.escapeHtml(label)}</div>\n    ${description ? `<p class="ef-stat-desc">${this.escapeHtml(description)}</p>` : ''}\n  </div>\n`;
            }

            // PREMIUM: CARD GRIDS
            if (block.type === 'card-grid-2col') {
                const cards = block.text.split('\n').filter(c => c.trim());
                let html = `  <div class="ef-card-grid ef-card-grid-2col">\n`;
                cards.forEach(card => {
                    const parts = card.split('|');
                    html += `    <div class="ef-card">\n      <div class="ef-card-icon"><i class="${this.escapeHtml(parts[1] || 'fas fa-star')}"></i></div>\n      <h4>${this.escapeHtml(parts[0] || '')}</h4>\n      <p>${this.escapeHtml(parts[2] || '')}</p>\n    </div>\n`;
                });
                html += `  </div>\n`;
                return html;
            }

            if (block.type === 'card-grid-3col') {
                const cards = block.text.split('\n').filter(c => c.trim());
                let html = `  <div class="ef-card-grid ef-card-grid-3col">\n`;
                cards.forEach(card => {
                    const parts = card.split('|');
                    html += `    <div class="ef-card">\n      <div class="ef-card-icon"><i class="${this.escapeHtml(parts[1] || 'fas fa-star')}"></i></div>\n      <h4>${this.escapeHtml(parts[0] || '')}</h4>\n      <p>${this.escapeHtml(parts[2] || '')}</p>\n    </div>\n`;
                });
                html += `  </div>\n`;
                return html;
            }

            if (block.type === 'card-grid-masonry') {
                const cards = block.text.split('\n').filter(c => c.trim());
                let html = `  <div class="ef-card-grid ef-card-grid-masonry">\n`;
                cards.forEach(card => {
                    const parts = card.split('|');
                    const size = parts[2] || 'medium';
                    html += `    <div class="ef-card ef-card-${size}">\n      <div class="ef-card-icon"><i class="${this.escapeHtml(parts[1] || 'fas fa-star')}"></i></div>\n      <h4>${this.escapeHtml(parts[0] || '')}</h4>\n      <p>${this.escapeHtml(parts[3] || '')}</p>\n    </div>\n`;
                });
                html += `  </div>\n`;
                return html;
            }

            // PREMIUM: CTA BLOCKS
            if (block.type === 'cta-center') {
                const lines = block.text.split('\n').filter(l => l.trim());
                const title = lines[0] || '';
                const description = lines[1] || '';
                const buttons = lines.slice(2);
                let html = `  <div class="ef-cta-block ef-cta-center">\n    <h3>${this.escapeHtml(title)}</h3>\n    <p>${this.escapeHtml(description)}</p>\n    <div class="ef-cta-buttons">\n`;
                buttons.forEach((btn, idx) => {
                    const parts = btn.split('|');
                    const isPrimary = idx === 0 ? ' ef-cta-btn-primary' : '';
                    html += `      <a href="${this.escapeHtml(parts[1] || '#')}" class="ef-cta-btn${isPrimary}">${this.escapeHtml(parts[0] || '')}</a>\n`;
                });
                html += `    </div>\n  </div>\n`;
                return html;
            }

            if (block.type === 'cta-split') {
                const lines = block.text.split('\n').filter(l => l.trim());
                const title = lines[0] || '';
                const description = lines[1] || '';
                const buttons = lines.slice(2);
                let html = `  <div class="ef-cta-block ef-cta-split">\n    <div class="ef-cta-content">\n      <h3>${this.escapeHtml(title)}</h3>\n      <p>${this.escapeHtml(description)}</p>\n    </div>\n    <div class="ef-cta-buttons">\n`;
                buttons.forEach((btn, idx) => {
                    const parts = btn.split('|');
                    const isPrimary = idx === 0 ? ' ef-cta-btn-primary' : '';
                    html += `      <a href="${this.escapeHtml(parts[1] || '#')}" class="ef-cta-btn${isPrimary}">${this.escapeHtml(parts[0] || '')}</a>\n`;
                });
                html += `    </div>\n  </div>\n`;
                return html;
            }

            if (block.type === 'cta-minimal') {
                const lines = block.text.split('\n').filter(l => l.trim());
                const btnParts = lines[2] ? lines[2].split('|') : ['', '#'];
                return `  <div class="ef-cta-block ef-cta-minimal">\n    <h3>${this.escapeHtml(lines[0] || '')}</h3>\n    <p>${this.escapeHtml(lines[1] || '')}</p>\n    <a href="${this.escapeHtml(btnParts[1])}" class="ef-cta-btn ef-cta-btn-primary">${this.escapeHtml(btnParts[0])}</a>\n  </div>\n`;
            }

            if (block.type === 'cta-urgent') {
                const lines = block.text.split('\n').filter(l => l.trim());
                const title = lines[0] || '';
                const description = lines[1] || '';
                const buttons = lines.slice(2);
                let html = `  <div class="ef-cta-block ef-cta-urgent">\n    <div class="ef-cta-badge">Limited Time</div>\n    <h3>${this.escapeHtml(title)}</h3>\n    <p>${this.escapeHtml(description)}</p>\n    <div class="ef-cta-buttons">\n`;
                buttons.forEach((btn, idx) => {
                    const parts = btn.split('|');
                    const isPrimary = idx === 0 ? ' ef-cta-btn-primary' : '';
                    html += `      <a href="${this.escapeHtml(parts[1] || '#')}" class="ef-cta-btn${isPrimary}">${this.escapeHtml(parts[0] || '')}</a>\n`;
                });
                html += `    </div>\n  </div>\n`;
                return html;
            }

            if (block.type === 'cta-newsletter') {
                const lines = block.text.split('\n').filter(l => l.trim());
                const btnParts = lines[3] ? lines[3].split('|') : ['Subscribe', '#'];
                return `  <div class="ef-cta-block ef-cta-newsletter">\n    <h3>${this.escapeHtml(lines[0] || '')}</h3>\n    <p>${this.escapeHtml(lines[1] || '')}</p>\n    <form class="ef-newsletter-form" action="${this.escapeHtml(btnParts[1])}" method="post">\n      <input type="email" class="ef-newsletter-input" placeholder="${this.escapeHtml(lines[2] || 'your@email.com')}" required>\n      <button type="submit" class="ef-cta-btn ef-cta-btn-primary">${this.escapeHtml(btnParts[0])}</button>\n    </form>\n  </div>\n`;
            }

            // PREMIUM: TABLES
            if (block.type === 'table-basic' || block.type === 'table-striped' || block.type === 'table-comparison') {
                const rows = block.text.split('\n').filter(r => r.trim());
                if (rows.length > 0) {
                    let html = `  <table class="ef-table ef-${block.type}">\n`;
                    rows.forEach((row, idx) => {
                        const cells = row.split('|').map(c => c.trim());
                        if (idx === 0) {
                            html += `    <thead>\n      <tr>\n`;
                            cells.forEach(cell => html += `        <th>${this.escapeHtml(cell)}</th>\n`);
                            html += `      </tr>\n    </thead>\n    <tbody>\n`;
                        } else {
                            html += `      <tr>\n`;
                            cells.forEach(cell => html += `        <td>${this.escapeHtml(cell)}</td>\n`);
                            html += `      </tr>\n`;
                        }
                    });
                    html += `    </tbody>\n  </table>\n`;
                    return html;
                }
            }

            // PREMIUM: TIMELINE
            if (block.type === 'timeline-vertical') {
                const items = block.text.split('\n').filter(i => i.trim());
                let html = `  <div class="ef-timeline ef-timeline-vertical">\n`;
                items.forEach((item, idx) => {
                    const parts = item.split('|');
                    const position = idx % 2 === 0 ? 'left' : 'right';
                    html += `    <div class="ef-timeline-item ef-timeline-${position}">\n      <div class="ef-timeline-marker"></div>\n      <div class="ef-timeline-content">\n        <div class="ef-timeline-date">${this.escapeHtml(parts[0] || '')}</div>\n        <h4>${this.escapeHtml(parts[1] || '')}</h4>\n        <p>${this.escapeHtml(parts[2] || '')}</p>\n      </div>\n    </div>\n`;
                });
                html += `  </div>\n`;
                return html;
            }

            if (block.type === 'timeline-horizontal') {
                const items = block.text.split('\n').filter(i => i.trim());
                let html = `  <div class="ef-timeline ef-timeline-horizontal">\n`;
                items.forEach(item => {
                    const parts = item.split('|');
                    html += `    <div class="ef-timeline-item">\n      <div class="ef-timeline-marker"></div>\n      <div class="ef-timeline-content">\n        <div class="ef-timeline-date">${this.escapeHtml(parts[0] || '')}</div>\n        <h4>${this.escapeHtml(parts[1] || '')}</h4>\n        <p>${this.escapeHtml(parts[2] || '')}</p>\n      </div>\n    </div>\n`;
                });
                html += `  </div>\n`;
                return html;
            }

            // PREMIUM: ACCORDION
            if (block.type === 'accordion-faq' || block.type === 'accordion-simple') {
                const items = block.text.split('\n').filter(i => i.trim());
                const icon = block.type === 'accordion-faq' ? 'question-circle' : 'chevron-right';
                let html = `  <div class="ef-accordion ef-${block.type}">\n`;
                items.forEach(item => {
                    const parts = item.split('|');
                    html += `    <div class="ef-accordion-item">\n      <div class="ef-accordion-header" onclick="this.parentElement.classList.toggle('ef-accordion-open')">\n        <i class="fas fa-${icon} ef-accordion-icon"></i>\n        <span>${this.escapeHtml(parts[0] || '')}</span>\n        <i class="fas fa-chevron-down ef-accordion-arrow"></i>\n      </div>\n      <div class="ef-accordion-content">\n        <p>${this.escapeHtml(parts[1] || '')}</p>\n      </div>\n    </div>\n`;
                });
                html += `  </div>\n`;
                return html;
            }

            // PREMIUM: POLLS
            if (block.type === 'poll-emoji' || block.type === 'poll-rating' || block.type === 'poll-vote') {
                const lines = block.text.split('|');
                const question = lines[0] || '';
                const pollId = 'poll-' + Math.random().toString(36).substr(2, 9);
                let html = `  <div class="ef-poll ef-${block.type}" id="${pollId}">\n    <div class="ef-poll-question">${this.escapeHtml(question)}</div>\n    <div class="ef-poll-options">\n`;
                for (let i = 1; i < lines.length; i += 2) {
                    if (lines[i] && lines[i + 1]) {
                        html += `      <div class="ef-poll-option" onclick="this.parentElement.querySelectorAll('.ef-poll-option').forEach(o => o.classList.remove('ef-poll-selected')); this.classList.add('ef-poll-selected');">\n        <div class="ef-poll-option-value">${this.escapeHtml(lines[i])}</div>\n        <div class="ef-poll-option-label">${this.escapeHtml(lines[i + 1])}</div>\n      </div>\n`;
                    }
                }
                html += `    </div>\n  </div>\n`;
                return html;
            }

            return '';
        }
    }

    // ============================================
    // STATIC METHOD FOR PREMIUM REGISTRATION
    // ============================================
    EfArticleBuilder.registerPremiumComponents = function (premiumData) {
        if (!premiumData || !premiumData.templates) {
            console.error('Invalid premium components data');
            return;
        }

        activeEditors.forEach(editor => {
            Object.assign(editor.templates, premiumData.templates);
            Object.assign(editor.componentGroups, premiumData.groups);
            Object.assign(editor.componentIcons, premiumData.icons);
            Object.assign(editor.componentLabels, premiumData.labels);

            if (editor.container.querySelector('.ef-components')) {
                const componentsDiv = editor.container.querySelector('.ef-components');
                componentsDiv.innerHTML = '<h3 class="ef-components-title">Komponen</h3>' + editor.getComponentsHTML();
                editor.attachComponentPreviewEvents();
                editor.initDragDrop();
            }
        });

        console.log('✓ Premium components registered successfully');
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EfArticleBuilder;
    } else {
        global.EfArticleBuilder = EfArticleBuilder;
    }

})(typeof window !== 'undefined' ? window : this);
