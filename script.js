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
            indicatorsSelector: '.products__indicators',
            autoplay: true,
            autoplayInterval: 4000,
            transitionDuration: 1000, // Transição mais longa para movimento fluido
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
        this.animationFrame = null;
        this.jumpTimeout = null;

        // Elementos DOM
        this.container = null;
        this.wrapper = null;
        this.carousel = null;
        this.cards = [];
        this.originalCards = [];
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
        
        // Configurar transição linear para movimento contínuo
        this.carousel.style.transition = `transform ${this.config.transitionDuration}ms linear`;
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
        this.currentIndex = index;
        
        const realIndex = index + this.clonesBefore;
        const cardWidth = this.getCardWidth();
        const wrapperWidth = this.getWrapperWidth();
        const centerOffset = (wrapperWidth - cardWidth) / 2;
        const translateX = -(realIndex * cardWidth) + centerOffset;

        if (animate) {
            // Aplicar transição suave
            this.carousel.style.transition = `transform ${this.config.transitionDuration}ms linear`;
        } else {
            this.carousel.style.transition = 'none';
        }

        // Aplicar transformação imediatamente
        this.carousel.style.transform = `translateX(${translateX}px)`;

        if (!animate) {
            // Forçar reflow para aplicar mudança
            void this.carousel.offsetHeight;
            // Restaurar transição
            this.carousel.style.transition = `transform ${this.config.transitionDuration}ms linear`;
            this.isTransitioning = false;
        }

        this.updateActiveStates();
    }

    handleTransitionEnd() {
        // Não fazer nada aqui - permitir movimento contínuo
        // O jump já foi feito durante a transição (via timeout em goToClone)
        // Não resetar isTransitioning aqui para não causar pausas
    }

    jumpToSlide(index) {
        // Limpar timeout do autoplay se estiver pendente para evitar conflito
        if (this.autoplayTimer) {
            clearTimeout(this.autoplayTimer);
            this.autoplayTimer = null;
        }
        
        // Limpar timeout do jump se ainda estiver pendente
        if (this.jumpTimeout) {
            clearTimeout(this.jumpTimeout);
            this.jumpTimeout = null;
        }
        
        // Jump instantâneo sem animação - fazer de forma completamente invisível
        const realIndex = index + this.clonesBefore;
        const cardWidth = this.getCardWidth();
        const wrapperWidth = this.getWrapperWidth();
        const centerOffset = (wrapperWidth - cardWidth) / 2;
        const translateX = -(realIndex * cardWidth) + centerOffset;

        // Fazer o jump de forma síncrona para evitar qualquer delay
        // Desabilitar transição temporariamente
        this.carousel.style.transition = 'none';
        this.carousel.style.transform = `translateX(${translateX}px)`;
        
        // Forçar reflow para aplicar a mudança imediatamente
        void this.carousel.offsetHeight;
        
        // Restaurar transição imediatamente
        this.carousel.style.transition = `transform ${this.config.transitionDuration}ms linear`;
        
        // Resetar flag imediatamente
        this.isTransitioning = false;
        
        // Atualizar estados imediatamente
        this.updateActiveStates();
        
        // Iniciar próximo movimento IMEDIATAMENTE após o jump
        // Sem usar requestAnimationFrame para evitar qualquer delay
        // O jump já foi aplicado sincronamente acima
        if (this.isPlaying && !this.isDragging) {
            // Calcular próximo índice e posição diretamente
            const nextIndex = this.currentIndex + 1;
            if (nextIndex >= this.totalSlides) {
                // Se passar do último, vai para o clone
                this.currentIndex = this.totalSlides;
                this.goToClone('next');
            } else {
                // Ir para o próximo card diretamente
                this.goToSlide(nextIndex, true);
            }
            // Reagendar o próximo movimento do autoplay
            this.scheduleNextAutoplay();
        }
    }
    
    scheduleNextAutoplay() {
        if (!this.isPlaying || this.isDragging) return;
        
        // Agendar próximo movimento para começar ANTES da transição terminar
        // Usar 92% para criar sobreposição e eliminar qualquer pausa
        // Mas não muito cedo para não interferir com o jump
        const overlapTime = this.config.transitionDuration * 0.92;
        this.autoplayTimer = setTimeout(() => {
            if (!this.isDragging && this.isPlaying) {
                this.next();
                // Agendar o próximo movimento imediatamente
                this.scheduleNextAutoplay();
            }
        }, overlapTime);
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
        // Não bloquear se estiver em transição - permitir movimento contínuo
        // O jump já foi agendado em goToClone, então podemos continuar
        
        const nextIndex = this.currentIndex + 1;
        
        // Se passar do último, vai para o clone (que depois fará o jump invisível)
        if (nextIndex >= this.totalSlides) {
            this.currentIndex = this.totalSlides;
            this.goToClone('next');
        } else {
            this.goToSlide(nextIndex, true);
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
        // Não setar isTransitioning para permitir movimento contínuo
        
        let realIndex;
        let targetIndex;
        if (direction === 'next') {
            // Clone do primeiro card está após os originais
            realIndex = this.totalSlides + this.clonesBefore;
            targetIndex = 0;
        } else {
            // Clone do último card está no início
            realIndex = this.clonesBefore - 1;
            targetIndex = this.totalSlides - 1;
        }

        const cardWidth = this.getCardWidth();
        const wrapperWidth = this.getWrapperWidth();
        const centerOffset = (wrapperWidth - cardWidth) / 2;
        const translateX = -(realIndex * cardWidth) + centerOffset;

        this.carousel.style.transition = `transform ${this.config.transitionDuration}ms linear`;
        this.carousel.style.transform = `translateX(${translateX}px)`;

        this.updateActiveStates();
        
        // Fazer o jump ANTES da transição terminar (85% da duração)
        // Isso garante que o jump aconteça quando o card ainda está saindo da tela
        // mas ainda visível o suficiente para o jump ser invisível
        // E permite que o próximo movimento comece imediatamente após sem pausa
        const jumpDelay = Math.max(50, this.config.transitionDuration * 0.85);
        this.jumpTimeout = setTimeout(() => {
            // Verificar se ainda estamos no clone antes de fazer o jump
            if ((direction === 'next' && this.currentIndex >= this.totalSlides) ||
                (direction === 'prev' && this.currentIndex < 0)) {
                this.currentIndex = targetIndex;
                this.jumpToSlide(this.currentIndex);
            }
        }, jumpDelay);
    }

    // =========================================
    // AUTOPLAY
    // =========================================
    startAutoplay() {
        if (!this.config.autoplay) return;
        this.isPlaying = true;
        
        // Iniciar o primeiro movimento imediatamente
        this.next();
        this.scheduleNextAutoplay();
    }

    stopAutoplay() {
        if (this.autoplayTimer) {
            clearTimeout(this.autoplayTimer);
            this.autoplayTimer = null;
        }
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        if (this.jumpTimeout) {
            clearTimeout(this.jumpTimeout);
            this.jumpTimeout = null;
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
        autoplayInterval: 2000, // Não usado mais, mas mantido para compatibilidade
        transitionDuration: 3000, // Transição mais lenta para movimento mais suave
        pauseOnHover: false // Não pausar no hover para movimento contínuo
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