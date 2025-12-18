/* =========================================
   ICARUS - Premium Mobile-First Script
   Infinite Loop Carousel with Smooth Transitions
   ========================================= */

// --- Loader ---
window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('hidden');
    }, 600);
});

// --- Infinite Loop Carousel Class ---
class InfiniteCarousel {
    constructor(options = {}) {
        // Configurações padrão
        this.config = {
            containerSelector: '.products',
            wrapperSelector: '.products__wrapper',
            carouselSelector: '.products__carousel',
            cardSelector: '.product-card',
            prevSelector: '.products__nav--prev',
            nextSelector: '.products__nav--next',
            indicatorsSelector: '.products__indicators',
            autoplay: true,
            autoplayInterval: 4000,
            transitionDuration: 500, // Transição mais suave
            pauseOnHover: true,
            ...options
        };

        // Estado
        this.currentIndex = 0;
        this.totalSlides = 0;
        this.autoplayTimer = null;
        this.isPlaying = this.config.autoplay;
        this.isDragging = false;
        this.isTransitioning = false;
        this.startX = 0;
        this.currentX = 0;
        this.dragThreshold = 50;

        // Elementos DOM
        this.container = null;
        this.wrapper = null;
        this.carousel = null;
        this.cards = [];
        this.originalCards = [];
        this.prevBtn = null;
        this.nextBtn = null;
        this.indicators = null;
        this.dots = [];

        this.init();
    }

    init() {
        this.container = document.querySelector(this.config.containerSelector);
        if (!this.container) return;

        this.wrapper = this.container.querySelector(this.config.wrapperSelector);
        this.carousel = this.container.querySelector(this.config.carouselSelector);
        this.originalCards = [...this.carousel.querySelectorAll(this.config.cardSelector)];
        this.prevBtn = this.container.querySelector(this.config.prevSelector);
        this.nextBtn = this.container.querySelector(this.config.nextSelector);
        this.indicators = this.container.querySelector(this.config.indicatorsSelector);

        this.totalSlides = this.originalCards.length;

        if (this.totalSlides === 0) return;

        // Configurar carousel infinito
        this.setupInfiniteCarousel();
        this.createIndicators();
        this.bindEvents();
        
        // Inicializar na posição correta (primeiro card real)
        setTimeout(() => {
            this.goToSlide(0, false);
        }, 100);

        // Iniciar autoplay
        if (this.config.autoplay) {
            setTimeout(() => {
                this.startAutoplay();
            }, 1000);
        }
    }

    setupInfiniteCarousel() {
        // Clonar cards para criar loop infinito
        // Estrutura: [clone último] [clone penúltimo] [originais...] [clone primeiro] [clone segundo]
        
        const fragment = document.createDocumentFragment();
        
        // Clonar os últimos 2 cards e adicionar no início
        for (let i = this.totalSlides - 1; i >= Math.max(0, this.totalSlides - 2); i--) {
            const clone = this.originalCards[i].cloneNode(true);
            clone.classList.add('clone');
            clone.setAttribute('data-clone', 'prepend');
            clone.setAttribute('data-original-index', i);
            this.carousel.insertBefore(clone, this.carousel.firstChild);
        }
        
        // Clonar os primeiros 2 cards e adicionar no final
        for (let i = 0; i < Math.min(2, this.totalSlides); i++) {
            const clone = this.originalCards[i].cloneNode(true);
            clone.classList.add('clone');
            clone.setAttribute('data-clone', 'append');
            clone.setAttribute('data-original-index', i);
            this.carousel.appendChild(clone);
        }

        // Atualizar lista de cards (incluindo clones)
        this.cards = [...this.carousel.querySelectorAll(this.config.cardSelector)];
        
        // Número de clones no início
        this.clonesBefore = Math.min(2, this.totalSlides);
        
        // Configurar transição
        this.carousel.style.transition = `transform ${this.config.transitionDuration}ms ease-in-out`;
    }

    createIndicators() {
        if (!this.indicators) return;

        this.indicators.innerHTML = '';

        // Criar dots apenas para cards originais
        for (let i = 0; i < this.totalSlides; i++) {
            const dot = document.createElement('button');
            dot.className = 'products__dot';
            dot.setAttribute('aria-label', `Ir para slide ${i + 1}`);
            dot.addEventListener('click', () => {
                this.goToSlide(i);
                this.resetAutoplayTimer();
            });
            this.indicators.appendChild(dot);
        }

        this.dots = [...this.indicators.querySelectorAll('.products__dot')];
    }

    bindEvents() {
        // Navegação por botões
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => {
                if (!this.isTransitioning) {
                    this.prev();
                    this.resetAutoplayTimer();
                }
            });
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => {
                if (!this.isTransitioning) {
                    this.next();
                    this.resetAutoplayTimer();
                }
            });
        }

        // Pausar autoplay no hover
        if (this.config.pauseOnHover) {
            this.container.addEventListener('mouseenter', () => this.pauseAutoplay());
            this.container.addEventListener('mouseleave', () => this.resumeAutoplay());
        }

        // Mouse drag events
        this.carousel.addEventListener('mousedown', (e) => this.handleDragStart(e));
        this.carousel.addEventListener('mousemove', (e) => this.handleDragMove(e));
        this.carousel.addEventListener('mouseup', (e) => this.handleDragEnd(e));
        this.carousel.addEventListener('mouseleave', (e) => {
            if (this.isDragging) this.handleDragEnd(e);
        });

        // Touch events
        this.carousel.addEventListener('touchstart', (e) => this.handleDragStart(e), { passive: true });
        this.carousel.addEventListener('touchmove', (e) => this.handleDragMove(e), { passive: true });
        this.carousel.addEventListener('touchend', (e) => this.handleDragEnd(e));

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Resize handler
        window.addEventListener('resize', () => this.handleResize());

        // Visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAutoplay();
            } else {
                this.resumeAutoplay();
            }
        });

        // Listener para fim da transição (para o loop infinito)
        this.carousel.addEventListener('transitionend', () => this.handleTransitionEnd());
    }

    getCardWidth() {
        return this.cards[0].offsetWidth;
    }

    getWrapperWidth() {
        return this.wrapper ? this.wrapper.offsetWidth : this.carousel.parentElement.offsetWidth;
    }

    goToSlide(index, animate = true) {
        if (this.isTransitioning && animate) return;

        this.currentIndex = index;
        
        // Índice real no array de cards (considerando os clones no início)
        const realIndex = index + this.clonesBefore;
        
        const cardWidth = this.getCardWidth();
        const wrapperWidth = this.getWrapperWidth();
        const centerOffset = (wrapperWidth - cardWidth) / 2;
        const translateX = -(realIndex * cardWidth) + centerOffset;

        if (animate) {
            this.isTransitioning = true;
            this.carousel.style.transition = `transform ${this.config.transitionDuration}ms ease-in-out`;
        } else {
            this.carousel.style.transition = 'none';
        }

        this.carousel.style.transform = `translateX(${translateX}px)`;

        // Forçar reflow se não for animado
        if (!animate) {
            this.carousel.offsetHeight; // Force reflow
            this.carousel.style.transition = `transform ${this.config.transitionDuration}ms ease-in-out`;
            this.isTransitioning = false;
        }

        this.updateActiveStates();
    }

    handleTransitionEnd() {
        this.isTransitioning = false;

        // Verificar se precisamos fazer o "jump" para criar loop infinito
        if (this.currentIndex >= this.totalSlides) {
            // Chegou no clone do início, voltar para o card real
            this.currentIndex = 0;
            this.jumpToSlide(this.currentIndex);
        } else if (this.currentIndex < 0) {
            // Chegou no clone do final, voltar para o card real
            this.currentIndex = this.totalSlides - 1;
            this.jumpToSlide(this.currentIndex);
        }
    }

    jumpToSlide(index) {
        // Jump instantâneo sem animação
        const realIndex = index + this.clonesBefore;
        const cardWidth = this.getCardWidth();
        const wrapperWidth = this.getWrapperWidth();
        const centerOffset = (wrapperWidth - cardWidth) / 2;
        const translateX = -(realIndex * cardWidth) + centerOffset;

        this.carousel.style.transition = 'none';
        this.carousel.style.transform = `translateX(${translateX}px)`;
        
        // Forçar reflow
        this.carousel.offsetHeight;
        
        // Restaurar transição
        this.carousel.style.transition = `transform ${this.config.transitionDuration}ms ease-in-out`;
        
        this.updateActiveStates();
    }

    updateActiveStates() {
        // Normalizar índice para o range dos cards originais
        let normalizedIndex = this.currentIndex;
        if (normalizedIndex < 0) normalizedIndex = this.totalSlides - 1;
        if (normalizedIndex >= this.totalSlides) normalizedIndex = 0;

        // Atualizar todos os cards (incluindo clones)
        this.cards.forEach((card, i) => {
            const isOriginal = !card.classList.contains('clone');
            const cardIndex = isOriginal 
                ? this.originalCards.indexOf(card)
                : parseInt(card.getAttribute('data-original-index'));
            
            card.classList.toggle('active', cardIndex === normalizedIndex);
        });

        // Atualizar dots
        if (this.dots) {
            this.dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === normalizedIndex);
            });
        }
    }

    next() {
        if (this.isTransitioning) return;
        
        // Avançar para o próximo
        const nextIndex = this.currentIndex + 1;
        
        // Se passar do último, vai para o clone (que depois fará o jump)
        if (nextIndex >= this.totalSlides) {
            this.currentIndex = this.totalSlides; // Vai para o clone
            this.goToClone('next');
        } else {
            this.goToSlide(nextIndex);
        }
    }

    prev() {
        if (this.isTransitioning) return;
        
        // Voltar para o anterior
        const prevIndex = this.currentIndex - 1;
        
        // Se passar do primeiro, vai para o clone (que depois fará o jump)
        if (prevIndex < 0) {
            this.currentIndex = -1; // Vai para o clone
            this.goToClone('prev');
        } else {
            this.goToSlide(prevIndex);
        }
    }

    goToClone(direction) {
        this.isTransitioning = true;
        
        let realIndex;
        if (direction === 'next') {
            // Clone do primeiro card está após os originais
            realIndex = this.totalSlides + this.clonesBefore;
        } else {
            // Clone do último card está no início
            realIndex = this.clonesBefore - 1;
        }

        const cardWidth = this.getCardWidth();
        const wrapperWidth = this.getWrapperWidth();
        const centerOffset = (wrapperWidth - cardWidth) / 2;
        const translateX = -(realIndex * cardWidth) + centerOffset;

        this.carousel.style.transition = `transform ${this.config.transitionDuration}ms ease-in-out`;
        this.carousel.style.transform = `translateX(${translateX}px)`;

        this.updateActiveStates();
    }

    // =========================================
    // AUTOPLAY
    // =========================================
    startAutoplay() {
        if (!this.config.autoplay) return;
        this.isPlaying = true;
        this.autoplayTimer = setInterval(() => {
            this.next();
        }, this.config.autoplayInterval);
    }

    stopAutoplay() {
        if (this.autoplayTimer) {
            clearInterval(this.autoplayTimer);
            this.autoplayTimer = null;
        }
    }

    pauseAutoplay() {
        this.stopAutoplay();
    }

    resumeAutoplay() {
        if (this.isPlaying && this.config.autoplay) {
            this.stopAutoplay();
            this.startAutoplay();
        }
    }

    resetAutoplayTimer() {
        if (this.isPlaying && this.config.autoplay) {
            this.stopAutoplay();
            this.startAutoplay();
        }
    }

    // =========================================
    // DRAG / TOUCH HANDLERS
    // =========================================
    handleDragStart(e) {
        if (this.isTransitioning) return;
        
        this.isDragging = true;
        this.startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
        this.carousel.classList.add('dragging');
        this.carousel.style.cursor = 'grabbing';
        this.pauseAutoplay();
    }

    handleDragMove(e) {
        if (!this.isDragging) return;
        if (e.type.includes('mouse')) e.preventDefault();
        this.currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    }

    handleDragEnd(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.carousel.classList.remove('dragging');
        this.carousel.style.cursor = 'grab';

        const diff = this.startX - this.currentX;

        if (Math.abs(diff) > this.dragThreshold) {
            if (diff > 0) {
                this.next();
            } else {
                this.prev();
            }
        }

        this.resumeAutoplay();
    }

    // =========================================
    // KEYBOARD NAVIGATION
    // =========================================
    handleKeyboard(e) {
        if (this.isTransitioning) return;
        
        if (e.key === 'ArrowLeft') {
            this.prev();
            this.resetAutoplayTimer();
        } else if (e.key === 'ArrowRight') {
            this.next();
            this.resetAutoplayTimer();
        }
    }

    // =========================================
    // RESIZE HANDLER
    // =========================================
    handleResize() {
        this.goToSlide(this.currentIndex, false);
    }

    // =========================================
    // PUBLIC API
    // =========================================
    destroy() {
        this.stopAutoplay();
    }

    getState() {
        return {
            currentIndex: this.currentIndex,
            totalSlides: this.totalSlides,
            isPlaying: this.isPlaying
        };
    }
}

// =========================================
// INICIALIZAÇÃO
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    const carousel = new InfiniteCarousel({
        autoplay: true,
        autoplayInterval: 4000,
        transitionDuration: 500,
        pauseOnHover: true
    });

    window.carousel = carousel;
});

// --- Smooth scroll for anchor links ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const target = document.querySelector(targetId);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});