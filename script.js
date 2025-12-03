// ============================================
// SCRIPT.JS - DOSТРОЧКА
// ВЕРСИЯ: 2.0.0 (С РЕАЛЬНОЙ СТАТИСТИКОЙ)
// ============================================

// Глобальная конфигурация
let SITE_CONFIG = {};
let IS_INITIALIZED = false;

// Загрузка конфигурации
async function loadConfig() {
    try {
        // Пробуем загрузить config.js
        const response = await fetch('config.js');
        const text = await response.text();
        
        // Извлекаем CONFIG из текста
        const match = text.match(/const CONFIG = ({[\s\S]*?});/);
        if (match) {
            SITE_CONFIG = eval('(' + match[1] + ')');
            console.log('✅ Конфигурация загружена:', SITE_CONFIG.SITE_NAME);
        } else {
            throw new Error('Конфиг не найден');
        }
    } catch (error) {
        console.warn('⚠️ Конфиг не загружен, используем значения по умолчанию');
        SITE_CONFIG = {
            DEBUG: true,
            STATS_UPDATE_INTERVAL: 30,
            FEATURES: {
                ENABLE_STATS: true,
                ENABLE_CONTACT_FORM: true,
                ENABLE_COMMENTS: true,
                ENABLE_LIKES: true,
                ENABLE_NEWSLETTER: true,
                ENABLE_VIDEOS: true
            }
        };
    }
}

// Основная функция инициализации
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 DOSТРОЧКА - Инициализация...');
    
    // Загружаем конфигурацию
    await loadConfig();
    
    // === ПРЕЛОАДЕР ===
    const preloader = document.getElementById('preloader');
    setTimeout(() => {
        preloader.classList.add('fade-out');
        setTimeout(() => {
            preloader.style.display = 'none';
            initAll();
        }, 500);
    }, 1500);
    
    // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
    function showCustomAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `custom-alert alert-${type}`;
        alert.innerHTML = `
            <div class="alert-content">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
                <p>${message}</p>
            </div>
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => alert.classList.add('show'), 100);
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => {
                if (alert.parentNode) {
                    document.body.removeChild(alert);
                }
            }, 300);
        }, 3000);
    }
    
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    function formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    function copyToClipboard(text, successMessage) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    showCustomAlert(successMessage);
                })
                .catch(err => {
                    fallbackCopyToClipboard(text, successMessage);
                });
        } else {
            fallbackCopyToClipboard(text, successMessage);
        }
    }
    
    function fallbackCopyToClipboard(text, successMessage) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showCustomAlert(successMessage);
    }
    
    // === ОТСЛЕЖИВАНИЕ СОБЫТИЙ ===
    function trackEvent(category, action, label, value = 1) {
        const eventData = {
            category,
            action,
            label: label || '',
            value,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 200),
            screen: `${window.innerWidth}x${window.innerHeight}`
        };
        
        // Google Analytics
        if (typeof gtag !== 'undefined' && SITE_CONFIG.GA_ID && SITE_CONFIG.GA_ID !== 'G-XXXXXXXXXX') {
            gtag('event', action, {
                event_category: category,
                event_label: label,
                value: value
            });
        }
        
        // Сохраняем локально
        const events = JSON.parse(localStorage.getItem('site_events') || '[]');
        events.push(eventData);
        
        // Ограничиваем количество событий
        const maxEvents = SITE_CONFIG.BACKUP?.MAX_LOCAL_EVENTS || 1000;
        if (events.length > maxEvents) {
            events.splice(0, events.length - maxEvents);
        }
        
        localStorage.setItem('site_events', JSON.stringify(events));
        
        // Отправляем в Google Forms (если настроено)
        sendToGoogleForms('event', JSON.stringify(eventData));
        
        if (SITE_CONFIG.DEBUG) {
            console.log(`📊 Событие: ${category}.${action}`, label ? `(${label})` : '');
        }
    }
    
    // === ОТПРАВКА В GOOGLE FORMS ===
    async function sendToGoogleForms(eventType, data) {
        if (!SITE_CONFIG.STATS_FORM_URL || SITE_CONFIG.STATS_FORM_URL.includes('XXXXXXXXXX')) {
            return false;
        }
        
        try {
            const formData = new FormData();
            formData.append(SITE_CONFIG.STATS_FORM_ENTRY || 'entry.1', eventType);
            formData.append('entry.2', typeof data === 'string' ? data : JSON.stringify(data));
            formData.append('entry.3', new Date().toISOString());
            formData.append('entry.4', navigator.userAgent.substring(0, 200));
            
            // Используем no-cors для обхода CORS
            await fetch(SITE_CONFIG.STATS_FORM_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: formData
            });
            
            return true;
        } catch (error) {
            if (SITE_CONFIG.DEBUG) {
                console.warn('⚠️ Не удалось отправить в Google Forms:', error);
            }
            return false;
        }
    }
    
    // === СТАТИСТИКА ПРОСМОТРОВ ===
    function updateViewStats() {
        const lastVisit = localStorage.getItem('lastVisitDate');
        const today = new Date().toDateString();
        let totalViews = parseInt(localStorage.getItem('totalViews') || '0');
        
        // Уникальный просмотр за день
        if (lastVisit !== today) {
            totalViews++;
            localStorage.setItem('totalViews', totalViews.toString());
            localStorage.setItem('lastVisitDate', today);
            
            trackEvent('site', 'unique_view', today, totalViews);
            
            // Отправляем в Google Forms
            sendToGoogleForms('site_view', {
                date: today,
                views: totalViews,
                is_unique: true
            });
        }
        
        // Общий счётчик просмотров (всех пользователей)
        const allTimeViews = parseInt(localStorage.getItem('allTimeViews') || '0') + 1;
        localStorage.setItem('allTimeViews', allTimeViews.toString());
        
        // Обновляем отображение
        const viewsElement = document.getElementById('totalViews');
        if (viewsElement) {
            viewsElement.textContent = allTimeViews.toLocaleString();
        }
        
        return { daily: totalViews, allTime: allTimeViews };
    }
    
    // === ОБНОВЛЕНИЕ ВСЕЙ СТАТИСТИКИ ===
    function updateReadingStats() {
        if (!SITE_CONFIG.FEATURES?.ENABLE_STATS) return;
        
        const likedPoems = JSON.parse(localStorage.getItem('likedPoems') || '{}');
        const totalPoems = document.querySelectorAll('.poem-card').length;
        
        // Лайки
        const totalLikes = Object.values(likedPoems).filter(v => v).length;
        
        // Комментарии
        let totalComments = 0;
        for (let i = 1; i <= totalPoems; i++) {
            const comments = JSON.parse(localStorage.getItem(`comments_${i}`) || '[]');
            totalComments += comments.length;
        }
        
        // Просмотры
        const viewStats = updateViewStats();
        
        // Обновляем DOM
        const poemsElement = document.getElementById('totalPoems');
        const likesElement = document.getElementById('totalLikes');
        const commentsElement = document.getElementById('totalComments');
        const viewsElement = document.getElementById('totalViews');
        
        if (poemsElement) poemsElement.textContent = totalPoems;
        if (likesElement) likesElement.textContent = totalLikes;
        if (commentsElement) commentsElement.textContent = totalComments;
        if (viewsElement) viewsElement.textContent = viewStats.allTime.toLocaleString();
        
        // Отправляем сводку
        if (Math.random() < 0.1) { // 10% chance чтобы не спамить
            sendToGoogleForms('stats_summary', {
                poems: totalPoems,
                likes: totalLikes,
                comments: totalComments,
                views: viewStats
            });
        }
        
        if (SITE_CONFIG.DEBUG) {
            console.log('📈 Статистика:', { poems: totalPoems, likes: totalLikes, comments: totalComments, views: viewStats.allTime });
        }
    }
    
    // === ИНИЦИАЛИЗАЦИЯ ВСЕХ КОМПОНЕНТОВ ===
    function initAll() {
        if (IS_INITIALIZED) return;
        IS_INITIALIZED = true;
        
        console.log('🎯 Инициализация компонентов DOSТРОЧКА...');
        
        // Инициализация в правильном порядке
        initSiteAnalytics();
        initProgressBar();
        initScrollToTop();
        initNavigation();
        initThemeToggle();
        initPoemCarousels();
        
        if (SITE_CONFIG.FEATURES?.ENABLE_CONTACT_FORM) {
            initContactForm();
        }
        
        if (SITE_CONFIG.FEATURES?.ENABLE_NEWSLETTER) {
            initNewsletter();
        }
        
        initSmoothScroll();
        
        if (SITE_CONFIG.FEATURES?.ENABLE_LIKES) {
            initPoemActions();
        }
        
        if (SITE_CONFIG.FEATURES?.ENABLE_VIDEOS) {
            initVideoModal();
        }
        
        if (SITE_CONFIG.FEATURES?.ENABLE_COMMENTS) {
            initCommentModal();
        }
        
        initReadingStats();
        initAudioPlayer();
        initFAQModal();
        initCookieNotice();
        initPrivacyPolicy();
        
        // Запускаем периодическое обновление статистики
        const interval = SITE_CONFIG.STATS_UPDATE_INTERVAL || 30;
        setInterval(updateReadingStats, interval * 1000);
        
        console.log('✅ DOSТРОЧКА полностью инициализирован!');
        trackEvent('site', 'loaded', 'full_init');
    }
    
    // === АНАЛИТИКА САЙТА ===
    function initSiteAnalytics() {
        // Отправляем событие о загрузке страницы
        trackEvent('page', 'view', document.title);
        
        // Отслеживаем клики по навигации
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                trackEvent('navigation', 'click', btn.dataset.section);
            });
        });
        
        // Отслеживаем клики по социальным ссылкам
        document.querySelectorAll('a[target="_blank"]').forEach(link => {
            link.addEventListener('click', () => {
                trackEvent('social', 'click', link.href);
            });
        });
        
        // Отслеживаем скролл
        let lastScrollReport = 0;
        window.addEventListener('scroll', () => {
            const now = Date.now();
            if (now - lastScrollReport > 5000) { // Раз в 5 секунд
                const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
                trackEvent('engagement', 'scroll', `percent_${scrollPercent}`);
                lastScrollReport = now;
            }
        });
        
        // Отслеживаем время на сайте
        setTimeout(() => {
            trackEvent('engagement', 'time_spent', '30_seconds');
        }, 30000);
        
        setTimeout(() => {
            trackEvent('engagement', 'time_spent', '1_minute');
        }, 60000);
        
        setTimeout(() => {
            trackEvent('engagement', 'time_spent', '5_minutes');
        }, 300000);
    }
    
    // === ПРОГРЕСС-БАР ===
    function initProgressBar() {
        const progressBar = document.getElementById('progressBar');
        if (!progressBar) return;
        
        window.addEventListener('scroll', () => {
            const total = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (window.scrollY / total) * 100;
            progressBar.style.width = `${Math.min(progress, 100)}%`;
        });
    }
    
    // === КНОПКА "НАТВЕРХ" ===
    function initScrollToTop() {
        const scrollToTopBtn = document.getElementById('scrollToTop');
        if (!scrollToTopBtn) return;
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        });
        
        scrollToTopBtn.addEventListener('click', () => {
            trackEvent('ui', 'click', 'scroll_to_top');
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // === НАВИГАЦИЯ ===
    function initNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        const sections = document.querySelectorAll('.section');
        const navbar = document.querySelector('.navbar');
        
        // Анимация появления кнопок навигации
        navBtns.forEach((btn, index) => {
            setTimeout(() => {
                btn.classList.add('animate-in');
            }, index * 100);
        });
        
        // Обработчик кликов по навигации
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = btn.dataset.section;
                
                // Убираем активный класс у всех кнопок
                navBtns.forEach(b => b.classList.remove('active'));
                // Добавляем активный класс текущей кнопке
                btn.classList.add('active');
                
                // Показываем целевую секцию
                showSection(targetId);
                
                // Прокрутка к секции
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    window.scrollTo({
                        top: targetSection.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            });
        });
        
        // Отслеживание скролла
        window.addEventListener('scroll', () => {
            const scrollPosition = window.scrollY + 100;
            
            // Обновляем навбар
            if (navbar) {
                navbar.classList.toggle('scrolled', window.scrollY > 50);
            }
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                
                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    const sectionId = section.id;
                    
                    // Обновляем навигацию
                    navBtns.forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.section === sectionId);
                    });
                    
                    // Показываем секцию
                    showSection(sectionId);
                }
            });
        });
        
        // Принудительно показываем домашнюю секцию при загрузке
        showSection('home');
    }
    
    // Функция показа секции
    function showSection(sectionId) {
        const sections = document.querySelectorAll('.section');
        const targetSection = document.getElementById(sectionId);
        
        // Скрываем все секции
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Показываем целевую секцию
        if (targetSection) {
            targetSection.classList.add('active');
            
            // Инициализируем карусель если это секция стихов
            if (sectionId === 'poems') {
                setTimeout(() => {
                    initPoemCarousels();
                    updateCommentButtonCounts();
                }, 300);
            }
        }
    }
    
    // === КАРУСЕЛЬ СТИХОВ ===
    function initPoemCarousels() {
        const carousels = document.querySelectorAll('.poems-carousel');
        
        carousels.forEach((carousel, carouselIndex) => {
            const wrapper = carousel.querySelector('.poems-wrapper');
            const poems = carousel.querySelectorAll('.poem-card');
            const prevBtn = carousel.querySelector('.carousel-btn.prev');
            const nextBtn = carousel.querySelector('.carousel-btn.next');
            const dotsContainer = carousel.querySelector('.carousel-dots');
            
            if (!wrapper || poems.length === 0) return;
            
            let currentIndex = 0;
            const poemsPerView = getPoemsPerView();
            const totalSlides = Math.max(1, Math.ceil(poems.length / poemsPerView));
            
            // Создаем точки навигации
            function createDots() {
                if (!dotsContainer) return;
                
                dotsContainer.innerHTML = '';
                for (let i = 0; i < totalSlides; i++) {
                    const dot = document.createElement('button');
                    dot.className = 'carousel-dot';
                    dot.setAttribute('aria-label', `Перейти к слайду ${i + 1}`);
                    dot.addEventListener('click', () => {
                        goToSlide(i);
                        trackEvent('carousel', 'dot_click', `slide_${i + 1}`);
                    });
                    dotsContainer.appendChild(dot);
                }
                updateDots();
            }
            
            function updateDots() {
                if (!dotsContainer) return;
                
                const dots = dotsContainer.querySelectorAll('.carousel-dot');
                dots.forEach((dot, index) => {
                    dot.classList.toggle('active', index === currentIndex);
                });
            }
            
            function goToSlide(index) {
                if (index < 0 || index >= totalSlides) return;
                
                currentIndex = index;
                const translateX = -currentIndex * (100 / poemsPerView);
                wrapper.style.transform = `translateX(${translateX}%)`;
                
                updateButtons();
                updateDots();
            }
            
            function updateButtons() {
                if (prevBtn) {
                    prevBtn.disabled = currentIndex === 0;
                }
                if (nextBtn) {
                    nextBtn.disabled = currentIndex === totalSlides - 1;
                }
            }
            
            function getPoemsPerView() {
                const width = window.innerWidth;
                if (width <= 768) return 1;
                if (width <= 1024) return 1;
                return 2;
            }
            
            function handleResize() {
                const newPoemsPerView = getPoemsPerView();
                currentIndex = 0;
                goToSlide(0);
            }
            
            // Инициализация карусели
            function initCarousel() {
                // Сбрасываем трансформацию
                wrapper.style.transform = 'translateX(0%)';
                
                // Создаем точки
                createDots();
                
                // Обновляем кнопки
                updateButtons();
                
                // Обработчики кнопок
                if (prevBtn) {
                    prevBtn.addEventListener('click', () => {
                        if (currentIndex > 0) {
                            goToSlide(currentIndex - 1);
                            trackEvent('carousel', 'prev_click', `from_${currentIndex + 1}_to_${currentIndex}`);
                        }
                    });
                }
                
                if (nextBtn) {
                    nextBtn.addEventListener('click', () => {
                        if (currentIndex < totalSlides - 1) {
                            goToSlide(currentIndex + 1);
                            trackEvent('carousel', 'next_click', `from_${currentIndex + 1}_to_${currentIndex + 2}`);
                        }
                    });
                }
                
                // Обработчик изменения размера
                window.addEventListener('resize', handleResize);
                
                // Анимация появления карточек
                setTimeout(() => {
                    poems.forEach((poem, index) => {
                        setTimeout(() => {
                            poem.style.opacity = '1';
                            poem.style.transform = 'translateY(0)';
                        }, index * 200);
                    });
                }, 500);
            }
            
            // Запускаем инициализацию
            initCarousel();
        });
    }
    
    // === ДЕЙСТВИЯ СО СТИХАМИ ===
    function initPoemActions() {
        if (!SITE_CONFIG.FEATURES?.ENABLE_LIKES) return;
        
        // Загружаем сохраненные лайки
        const likedPoems = JSON.parse(localStorage.getItem('likedPoems') || '{}');
        
        // Инициализируем кнопки лайка
        document.querySelectorAll('.poem-action-btn').forEach(btn => {
            const icon = btn.querySelector('i');
            
            if (icon.classList.contains('fa-heart')) {
                const poemCard = btn.closest('.poem-card');
                const poemId = poemCard.dataset.poemId;
                const poemTitle = poemCard.querySelector('h4').textContent;
                
                // Устанавливаем начальное состояние
                if (likedPoems[poemId]) {
                    icon.classList.remove('far');
                    icon.classList.add('fas', 'liked');
                }
                
                // Обработчик клика
                btn.addEventListener('click', () => {
                    toggleLike(poemId, icon, poemCard);
                });
            }
            
            if (icon.classList.contains('fa-share')) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const poemCard = btn.closest('.poem-card');
                    sharePoem(poemCard);
                    trackEvent('poem', 'share', poemCard.dataset.poemId);
                });
            }
        });
        
        // Обновляем счетчики на кнопках комментариев
        updateCommentButtonCounts();
    }
    
    // Функция лайка стиха
    function toggleLike(poemId, icon, poemCard) {
        if (!SITE_CONFIG.FEATURES?.ENABLE_LIKES) return;
        
        const likedPoems = JSON.parse(localStorage.getItem('likedPoems') || '{}');
        const poemTitle = poemCard.querySelector('h4').textContent;
        
        if (likedPoems[poemId]) {
            // Убираем лайк
            likedPoems[poemId] = false;
            icon.classList.remove('fas', 'liked');
            icon.classList.add('far');
            showCustomAlert(`Лайк убран со стиха "${poemTitle}"`);
            trackEvent('poem', 'unlike', poemId);
            
            sendToGoogleForms('poem_unlike', {
                poem_id: poemId,
                poem_title: poemTitle,
                timestamp: new Date().toISOString()
            });
        } else {
            // Ставим лайк
            likedPoems[poemId] = true;
            icon.classList.remove('far');
            icon.classList.add('fas', 'liked');
            
            // Анимация лайка
            icon.style.transform = 'scale(1.3)';
            setTimeout(() => {
                icon.style.transform = 'scale(1)';
            }, 300);
            
            showCustomAlert(`Лайк поставлен стиху "${poemTitle}"`);
            trackEvent('poem', 'like', poemId);
            
            // Отправляем статистику лайка
            sendToGoogleForms('poem_like', {
                poem_id: poemId,
                poem_title: poemTitle,
                timestamp: new Date().toISOString()
            });
        }
        
        // Сохраняем в localStorage
        localStorage.setItem('likedPoems', JSON.stringify(likedPoems));
        
        // Обновляем статистику
        updateReadingStats();
    }
    
    // Функция поделиться стихом
    function sharePoem(poemCard) {
        const poemId = poemCard.dataset.poemId;
        const poemTitle = poemCard.querySelector('h4').textContent;
        const poemText = poemCard.querySelector('.poem-text').textContent;
        const poemDate = poemCard.querySelector('.poem-date').textContent;
        
        const shareText = `${poemTitle}\n\n${poemText}\n\n${poemDate}\n\nИсточник: DOSТРОЧКА - Поэзия в движении`;
        
        if (navigator.share) {
            navigator.share({
                title: poemTitle,
                text: shareText,
                url: window.location.href + '#poem-' + poemId
            })
            .then(() => {
                trackEvent('share', 'success', poemId);
                sendToGoogleForms('poem_share', {
                    poem_id: poemId,
                    poem_title: poemTitle,
                    method: 'native_share',
                    timestamp: new Date().toISOString()
                });
            })
            .catch((error) => {
                console.log('Ошибка шаринга:', error);
                trackEvent('share', 'error', poemId);
            });
        } else {
            copyToClipboard(shareText, 'Текст стиха скопирован в буфер обмена!');
            trackEvent('share', 'copy', poemId);
            
            sendToGoogleForms('poem_share', {
                poem_id: poemId,
                poem_title: poemTitle,
                method: 'copy_clipboard',
                timestamp: new Date().toISOString()
            });
        }
    }
    
    // === МОДАЛЬНОЕ ОКНО КОММЕНТАРИЕВ ===
    function initCommentModal() {
        if (!SITE_CONFIG.FEATURES?.ENABLE_COMMENTS) return;
        
        const commentModal = document.getElementById('commentModal');
        const commentModalClose = document.getElementById('commentModalClose');
        const commentsList = document.getElementById('commentsList');
        const commentPoemTitle = document.getElementById('commentPoemTitle');
        const commentText = document.getElementById('commentText');
        const submitComment = document.getElementById('submitComment');
        const commentCancel = document.getElementById('commentCancel');
        const charCount = document.getElementById('charCount');
        
        let currentPoemId = null;
        let currentPoemTitle = null;
        
        // Обработчики для кнопок "Комментарий"
        document.querySelectorAll('.comment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const poemId = btn.dataset.poemId;
                const poemCard = btn.closest('.poem-card');
                const poemTitle = poemCard.querySelector('h4').textContent;
                
                currentPoemId = poemId;
                currentPoemTitle = poemTitle;
                commentPoemTitle.textContent = `"${poemTitle}"`;
                
                // Загружаем комментарии и статистику
                loadComments(poemId);
                updateCommentStats(poemId);
                
                // Показываем модальное окно
                commentModal.classList.add('active');
                document.body.style.overflow = 'hidden';
                
                // Отслеживаем открытие
                trackEvent('comments', 'open', poemId);
                
                // Фокусируемся на поле ввода
                setTimeout(() => {
                    commentText.focus();
                }, 300);
            });
        });
        
        // Счетчик символов
        commentText.addEventListener('input', () => {
            const length = commentText.value.length;
            charCount.textContent = length;
            
            if (length > 500) {
                commentText.value = commentText.value.substring(0, 500);
                charCount.textContent = 500;
                charCount.style.color = 'var(--accent-coral)';
            } else if (length > 450) {
                charCount.style.color = 'var(--accent-coral)';
            } else {
                charCount.style.color = 'var(--text-gray)';
            }
        });
        
        // Загрузка комментариев
        function loadComments(poemId) {
            const comments = JSON.parse(localStorage.getItem(`comments_${poemId}`) || '[]');
            commentsList.innerHTML = '';
            
            if (comments.length === 0) {
                commentsList.innerHTML = `
                    <div class="no-comments">
                        <i class="fas fa-comment-slash"></i>
                        <p>Пока нет комментариев. Будьте первым!</p>
                    </div>
                `;
                return;
            }
            
            comments.forEach(comment => {
                const commentItem = document.createElement('div');
                commentItem.className = 'comment-item';
                commentItem.innerHTML = `
                    <div class="comment-header">
                        <div class="comment-author">${comment.author || 'Аноним'}</div>
                        <div class="comment-date">${formatDate(comment.timestamp)}</div>
                    </div>
                    <div class="comment-text">${comment.text}</div>
                `;
                commentsList.appendChild(commentItem);
            });
            
            // Прокручиваем к последнему комментарию
            commentsList.scrollTop = commentsList.scrollHeight;
        }
        
        // Обновление статистики комментариев
        function updateCommentStats(poemId) {
            const comments = JSON.parse(localStorage.getItem(`comments_${poemId}`) || '[]');
            const likedPoems = JSON.parse(localStorage.getItem('likedPoems') || '{}');
            
            document.getElementById('commentCount').textContent = comments.length;
            document.getElementById('poemLikes').textContent = likedPoems[poemId] ? 1 : 0;
        }
        
        // Отправка комментария
        submitComment.addEventListener('click', (e) => {
            e.preventDefault();
            const text = commentText.value.trim();
            
            if (!text) {
                showCustomAlert('Пожалуйста, напишите комментарий', 'error');
                commentText.focus();
                return;
            }
            
            if (text.length > 500) {
                showCustomAlert('Комментарий не должен превышать 500 символов', 'error');
                return;
            }
            
            const comments = JSON.parse(localStorage.getItem(`comments_${currentPoemId}`) || '[]');
            const newComment = {
                text: text,
                author: 'Вы',
                timestamp: new Date().toISOString(),
                id: Date.now()
            };
            
            comments.push(newComment);
            localStorage.setItem(`comments_${currentPoemId}`, JSON.stringify(comments));
            
            // Обновляем список комментариев
            loadComments(currentPoemId);
            
            // Обновляем статистику
            updateCommentStats(currentPoemId);
            
            // Обновляем счетчик на кнопке
            updateCommentButtonCounts();
            
            // Обновляем общую статистику
            updateReadingStats();
            
            // Отслеживаем событие
            trackEvent('comments', 'add', currentPoemId);
            
            // Отправляем в Google Forms
            sendToGoogleForms('poem_comment', {
                poem_id: currentPoemId,
                poem_title: currentPoemTitle,
                comment_length: text.length,
                timestamp: new Date().toISOString()
            });
            
            // Очищаем поле ввода
            commentText.value = '';
            charCount.textContent = '0';
            charCount.style.color = 'var(--text-gray)';
            
            // Показываем уведомление
            showCustomAlert('Комментарий добавлен!');
            
            // Фокусируемся обратно на поле ввода
            setTimeout(() => {
                commentText.focus();
            }, 100);
        });
        
        // Отправка по Enter
        commentText.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitComment.click();
            }
        });
        
        // Кнопка отмены
        commentCancel.addEventListener('click', closeCommentModal);
        
        // Закрытие модального окна
        commentModalClose.addEventListener('click', closeCommentModal);
        
        // Закрытие по клику вне окна
        commentModal.addEventListener('click', (e) => {
            if (e.target === commentModal) {
                closeCommentModal();
            }
        });
        
        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && commentModal.classList.contains('active')) {
                closeCommentModal();
            }
        });
        
        function closeCommentModal() {
            commentModal.classList.remove('active');
            document.body.style.overflow = 'auto';
            commentText.value = '';
            charCount.textContent = '0';
            charCount.style.color = 'var(--text-gray)';
            trackEvent('comments', 'close', currentPoemId);
        }
    }
    
    // Обновление счетчиков на кнопках комментариев
    function updateCommentButtonCounts() {
        document.querySelectorAll('.comment-btn').forEach(btn => {
            const poemId = btn.dataset.poemId;
            const comments = JSON.parse(localStorage.getItem(`comments_${poemId}`) || '[]');
            
            if (comments.length > 0) {
                btn.classList.add('has-comments');
                btn.setAttribute('data-count', comments.length);
            } else {
                btn.classList.remove('has-comments');
                btn.removeAttribute('data-count');
            }
        });
    }
    
    // === ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ ===
    function initThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        const body = document.body;
        
        if (!themeToggle) return;
        
        const savedTheme = localStorage.getItem('theme') || 'dark';
        body.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
        
        themeToggle.addEventListener('click', () => {
            const currentTheme = body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
            
            trackEvent('ui', 'theme_change', newTheme);
            
            showCustomAlert(`Тема изменена на ${newTheme === 'dark' ? 'тёмную' : 'светлую'}`);
        });
        
        function updateThemeIcon(theme) {
            const icon = themeToggle.querySelector('i');
            if (theme === 'dark') {
                icon.className = 'fas fa-moon';
            } else {
                icon.className = 'fas fa-sun';
            }
        }
    }
    
    // === МОДАЛЬНОЕ ОКНО ВИДЕО ===
    function initVideoModal() {
        if (!SITE_CONFIG.FEATURES?.ENABLE_VIDEOS) return;
        
        const videoModal = document.getElementById('videoModal');
        const videoModalClose = document.getElementById('videoModalClose');
        const poemVideo = document.getElementById('poemVideo');
        const videoTitle = document.getElementById('videoTitle');
        const videoDescription = document.getElementById('videoDescription');
        
        // Обработчики для кнопок "Смотреть клип"
        document.querySelectorAll('.poem-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const poemCard = btn.closest('.poem-card');
                const poemTitle = poemCard.querySelector('h4').textContent;
                const videoFile = btn.dataset.video;
                const poemId = btn.dataset.poemId;
                
                if (videoFile && videoFile.trim() !== '') {
                    // Показываем видео
                    videoTitle.textContent = poemTitle;
                    videoDescription.textContent = 'Клип к стиху';
                    
                    // Обновляем статистику просмотров
                    updateVideoViews(poemId, poemTitle);
                    
                    // Создаем путь к видео файлу
                    const videoPath = `assets/videos/${videoFile}`;
                    
                    // Устанавливаем источник видео
                    poemVideo.src = videoPath;
                    
                    // Показываем модальное окно
                    videoModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                    
                    // Отслеживаем открытие видео
                    trackEvent('video', 'open', poemId);
                    
                    // Воспроизводим видео после загрузки
                    poemVideo.addEventListener('loadedmetadata', () => {
                        poemVideo.play().catch(e => {
                            console.log('Автовоспроизведение заблокировано');
                        });
                    });
                    
                    // Отслеживаем завершение просмотра
                    poemVideo.addEventListener('ended', () => {
                        trackEvent('video', 'complete', poemId);
                    });
                    
                    // Обработчик ошибок
                    poemVideo.addEventListener('error', () => {
                        showCustomAlert(`Ошибка загрузки видео. Убедитесь, что файл ${videoFile} находится в папке assets/videos/`, 'error');
                        trackEvent('video', 'error', poemId);
                    });
                    
                } else {
                    // Видео нет
                    showCustomAlert(`Клип для стиха "${poemTitle}" появится в ближайшее время!`);
                    trackEvent('video', 'not_available', poemId);
                }
            });
        });
        
        // Закрытие модального окна
        videoModalClose.addEventListener('click', closeVideoModal);
        
        // Закрытие по клику вне окна
        videoModal.addEventListener('click', (e) => {
            if (e.target === videoModal) {
                closeVideoModal();
            }
        });
        
        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && videoModal.classList.contains('active')) {
                closeVideoModal();
            }
        });
        
        function closeVideoModal() {
            videoModal.classList.remove('active');
            document.body.style.overflow = 'auto';
            poemVideo.pause();
            poemVideo.currentTime = 0;
            poemVideo.src = '';
        }
    }
    
    // Обновление статистики просмотров видео
    function updateVideoViews(poemId, poemTitle) {
        const videoViews = JSON.parse(localStorage.getItem('videoViews') || '{}');
        videoViews[poemId] = (videoViews[poemId] || 0) + 1;
        localStorage.setItem('videoViews', JSON.stringify(videoViews));
        
        // Отслеживаем просмотр
        trackEvent('video', 'view', poemId, videoViews[poemId]);
        
        // Отправляем в Google Forms
        sendToGoogleForms('video_view', {
            poem_id: poemId,
            poem_title: poemTitle,
            view_count: videoViews[poemId],
            timestamp: new Date().toISOString()
        });
        
        // Обновляем отображение
        const currentViews = videoViews[poemId] || 0;
        document.getElementById('videoViews').textContent = currentViews.toLocaleString();
        document.getElementById('videoDate').textContent = new Date().toLocaleDateString('ru-RU');
    }
    
    // === ФОРМА КОНТАКТОВ ===
    function initContactForm() {
        if (!SITE_CONFIG.FEATURES?.ENABLE_CONTACT_FORM) return;
        
        const form = document.getElementById('contactForm');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = form.querySelector('input[type="text"]').value.trim();
            const email = form.querySelector('input[type="email"]').value.trim();
            const message = form.querySelector('textarea').value.trim();
            const submitBtn = form.querySelector('.submit-btn');
            const originalText = submitBtn.innerHTML;
            
            // Валидация
            if (!name || !email || !message) {
                showCustomAlert('Пожалуйста, заполните все обязательные поля', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showCustomAlert('Пожалуйста, введите корректный email', 'error');
                return;
            }
            
            // Анимация отправки
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
            submitBtn.disabled = true;
            
            try {
                // Отправляем в Google Forms
                if (SITE_CONFIG.CONTACT_FORM_URL && !SITE_CONFIG.CONTACT_FORM_URL.includes('XXXXXXXXXX')) {
                    const formData = new FormData();
                    const entries = SITE_CONFIG.CONTACT_FORM_ENTRIES;
                    
                    formData.append(entries.name || 'entry.1', name);
                    formData.append(entries.email || 'entry.2', email);
                    formData.append(entries.message || 'entry.3', message);
                    formData.append('entry.4', new Date().toISOString());
                    
                    await fetch(SITE_CONFIG.CONTACT_FORM_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        body: formData
                    });
                }
                
                // Отслеживаем событие
                trackEvent('contact', 'submit', name.substring(0, 20));
                
                // Сохраняем локально для резерва
                const contacts = JSON.parse(localStorage.getItem('contactSubmissions') || '[]');
                contacts.push({
                    name,
                    email: email.substring(0, 3) + '***', // Анонимизируем email
                    message: message.substring(0, 100),
                    timestamp: new Date().toISOString(),
                    sent: true
                });
                
                // Ограничиваем количество сообщений
                const maxMessages = SITE_CONFIG.BACKUP?.MAX_LOCAL_MESSAGES || 100;
                if (contacts.length > maxMessages) {
                    contacts.splice(0, contacts.length - maxMessages);
                }
                
                localStorage.setItem('contactSubmissions', JSON.stringify(contacts));
                
                // Успех
                showCustomAlert(`Спасибо, ${name}! Ваше сообщение отправлено. Мы свяжемся с вами в течение 24 часов.`);
                form.reset();
                
            } catch (error) {
                // Если не удалось отправить, сохраняем для повторной отправки
                const pending = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
                pending.push({
                    name,
                    email,
                    message,
                    timestamp: new Date().toISOString(),
                    attempts: 1
                });
                localStorage.setItem('pendingMessages', JSON.stringify(pending));
                
                showCustomAlert('Сообщение сохранено. Мы отправим его при восстановлении связи.');
                
                trackEvent('contact', 'error', 'save_local');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
        
        // Пробуем отправить сохранённые сообщения
        retryPendingMessages();
    }
    
    // Повторная отправка сохранённых сообщений
    async function retryPendingMessages() {
        const pending = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
        if (pending.length === 0) return;
        
        console.log(`📨 Пробуем отправить ${pending.length} сохранённых сообщений...`);
        
        const failed = [];
        
        for (const msg of pending) {
            try {
                if (SITE_CONFIG.CONTACT_FORM_URL && !SITE_CONFIG.CONTACT_FORM_URL.includes('XXXXXXXXXX')) {
                    const formData = new FormData();
                    const entries = SITE_CONFIG.CONTACT_FORM_ENTRIES;
                    
                    formData.append(entries.name || 'entry.1', msg.name);
                    formData.append(entries.email || 'entry.2', msg.email);
                    formData.append(entries.message || 'entry.3', msg.message);
                    formData.append('entry.4', msg.timestamp);
                    
                    await fetch(SITE_CONFIG.CONTACT_FORM_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        body: formData
                    });
                    
                    console.log(`✅ Сообщение от ${msg.name} отправлено`);
                    trackEvent('contact', 'retry_success', msg.name.substring(0, 10));
                }
            } catch (error) {
                msg.attempts = (msg.attempts || 0) + 1;
                if (msg.attempts < 5) {
                    failed.push(msg);
                } else {
                    trackEvent('contact', 'retry_failed', 'max_attempts');
                }
            }
        }
        
        localStorage.setItem('pendingMessages', JSON.stringify(failed));
        
        if (failed.length === 0) {
            console.log('✅ Все сообщения отправлены');
        } else {
            console.log(`⚠️ ${failed.length} сообщений не отправлены, попробуем позже`);
        }
    }
    
    // === РАССЫЛКА ===
    function initNewsletter() {
        if (!SITE_CONFIG.FEATURES?.ENABLE_NEWSLETTER) return;
        
        const newsletterForm = document.querySelector('.newsletter-form');
        if (!newsletterForm) return;
        
        const emailInput = newsletterForm.querySelector('input[type="email"]');
        const submitBtn = newsletterForm.querySelector('button');
        
        submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            
            if (!email) {
                showCustomAlert('Пожалуйста, введите email', 'error');
                emailInput.focus();
                return;
            }
            
            if (!isValidEmail(email)) {
                showCustomAlert('Пожалуйста, введите корректный email', 'error');
                emailInput.focus();
                return;
            }
            
            // Сохраняем подписку
            const subscriptions = JSON.parse(localStorage.getItem('newsletterSubscriptions') || '[]');
            if (!subscriptions.includes(email)) {
                subscriptions.push(email);
                localStorage.setItem('newsletterSubscriptions', JSON.stringify(subscriptions));
                
                // Отслеживаем подписку
                trackEvent('newsletter', 'subscribe', email.substring(0, 10));
                
                // Отправляем в Google Forms
                sendToGoogleForms('newsletter_subscribe', {
                    email: email.substring(0, 3) + '***', // Анонимизируем
                    timestamp: new Date().toISOString()
                });
            }
            
            showCustomAlert('Спасибо за подписку! Теперь вы будете получать уведомления о новых стихах.');
            emailInput.value = '';
        });
    }
    
    // === FAQ МОДАЛЬНОЕ ОКНО ===
    function initFAQModal() {
        const faqModal = document.getElementById('faqModal');
        const faqModalClose = document.getElementById('faqModalClose');
        const faqLink = document.getElementById('faqLink');
        const faqQuestions = document.querySelectorAll('.faq-question');
        
        // Открытие FAQ
        if (faqLink) {
            faqLink.addEventListener('click', (e) => {
                e.preventDefault();
                faqModal.classList.add('active');
                document.body.style.overflow = 'hidden';
                trackEvent('ui', 'faq_open');
            });
        }
        
        // Закрытие FAQ
        faqModalClose.addEventListener('click', () => {
            faqModal.classList.remove('active');
            document.body.style.overflow = 'auto';
            trackEvent('ui', 'faq_close');
        });
        
        // Закрытие по клику вне окна
        faqModal.addEventListener('click', (e) => {
            if (e.target === faqModal) {
                faqModal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
        
        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && faqModal.classList.contains('active')) {
                faqModal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
        
        // Аккордеон для вопросов
        faqQuestions.forEach(question => {
            question.addEventListener('click', () => {
                const answer = question.nextElementSibling;
                const isActive = answer.classList.contains('active');
                const questionText = question.querySelector('span').textContent;
                
                // Закрываем все ответы
                document.querySelectorAll('.faq-answer').forEach(ans => {
                    ans.classList.remove('active');
                });
                document.querySelectorAll('.faq-question').forEach(q => {
                    q.classList.remove('active');
                });
                
                // Открываем текущий ответ если был закрыт
                if (!isActive) {
                    answer.classList.add('active');
                    question.classList.add('active');
                    trackEvent('faq', 'open', questionText);
                }
            });
        });
    }
    
    // === УВЕДОМЛЕНИЕ О COOKIE ===
    function initCookieNotice() {
        const cookieNotice = document.getElementById('cookieNotice');
        const cookieAccept = document.getElementById('cookieAccept');
        const cookieReject = document.getElementById('cookieReject');
        
        if (!cookieNotice) return;
        
        // Проверяем, было ли уже принято решение
        const cookieDecision = localStorage.getItem('cookieDecision');
        if (cookieDecision) {
            cookieNotice.style.display = 'none';
            return;
        }
        
        // Показываем уведомление через 2 секунды
        setTimeout(() => {
            cookieNotice.classList.add('active');
            trackEvent('cookie', 'notice_shown');
        }, 2000);
        
        // Обработчики кнопок
        cookieAccept.addEventListener('click', () => {
            localStorage.setItem('cookieDecision', 'accepted');
            cookieNotice.classList.remove('active');
            setTimeout(() => {
                cookieNotice.style.display = 'none';
            }, 500);
            showCustomAlert('Спасибо за принятие файлов cookie!');
            trackEvent('cookie', 'accepted');
        });
        
        cookieReject.addEventListener('click', () => {
            localStorage.setItem('cookieDecision', 'rejected');
            cookieNotice.classList.remove('active');
            setTimeout(() => {
                cookieNotice.style.display = 'none';
            }, 500);
            showCustomAlert('Файлы cookie отклонены. Некоторые функции могут быть недоступны.');
            trackEvent('cookie', 'rejected');
        });
    }
    
    // === ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ ===
    function initPrivacyPolicy() {
        const privacyLinks = document.querySelectorAll('#privacyPolicy, #privacyPolicyBottom');
        const termsLinks = document.querySelectorAll('#termsOfUse, #termsOfUseBottom');
        const cookiePolicyLink = document.getElementById('cookiePolicy');
        
        privacyLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showCustomAlert('Политика конфиденциальности: Мы собираем только необходимые данные для работы сайта и не передаем их третьим лицам.');
                trackEvent('legal', 'privacy_view');
            });
        });
        
        termsLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showCustomAlert('Условия использования: Вы можете свободно читать стихи и оставлять комментарии, соблюдая правила сообщества.');
                trackEvent('legal', 'terms_view');
            });
        });
        
        if (cookiePolicyLink) {
            cookiePolicyLink.addEventListener('click', (e) => {
                e.preventDefault();
                showCustomAlert('Файлы cookie: Мы используем файлы cookie для сохранения ваших лайков и комментариев.');
                trackEvent('legal', 'cookie_view');
            });
        }
    }
    
    // === АУДИОПЛЕЕР ===
    function initAudioPlayer() {
        const audioPlayer = document.getElementById('audioPlayer');
        // Заглушка для будущей реализации аудиоверсий стихов
    }
    
    // === ПЛАВНЫЙ СКРОЛЛ ===
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                
                if (target) {
                    const targetId = target.id;
                    showSection(targetId);
                    
                    window.scrollTo({
                        top: target.offsetTop - 80,
                        behavior: 'smooth'
                    });
                    
                    trackEvent('navigation', 'scroll_to', targetId);
                }
            });
        });
    }
    
    // === ФУНКЦИИ ЭКСПОРТА ДАННЫХ ===
    window.exportSiteData = function() {
        const data = {
            exported_at: new Date().toISOString(),
            site: SITE_CONFIG.SITE_NAME || 'DOSТРОЧКА',
            version: SITE_CONFIG.VERSION || '2.0.0',
            
            statistics: {
                total_views: parseInt(localStorage.getItem('totalViews') || '0'),
                all_time_views: parseInt(localStorage.getItem('allTimeViews') || '0'),
                last_visit: localStorage.getItem('lastVisitDate'),
                
                poems: {
                    total: document.querySelectorAll('.poem-card').length,
                    likes: Object.values(JSON.parse(localStorage.getItem('likedPoems') || '{}')).filter(v => v).length,
                    comments: (() => {
                        let total = 0;
                        const totalPoems = document.querySelectorAll('.poem-card').length;
                        for (let i = 1; i <= totalPoems; i++) {
                            const comments = JSON.parse(localStorage.getItem(`comments_${i}`) || '[]');
                            total += comments.length;
                        }
                        return total;
                    })()
                },
                
                videos: JSON.parse(localStorage.getItem('videoViews') || '{}')
            },
            
            user_data: {
                events: JSON.parse(localStorage.getItem('site_events') || '[]'),
                contacts: JSON.parse(localStorage.getItem('contactSubmissions') || '[]'),
                subscriptions: JSON.parse(localStorage.getItem('newsletterSubscriptions') || '[]'),
                pending_messages: JSON.parse(localStorage.getItem('pendingMessages') || '[]')
            },
            
            system: {
                user_agent: navigator.userAgent,
                screen_size: `${window.innerWidth}x${window.innerHeight}`,
                language: navigator.language,
                cookies_enabled: navigator.cookieEnabled,
                online: navigator.onLine
            }
        };
        
        console.log('📊 Данные для экспорта:', data);
        return data;
    };
    
    window.downloadSiteStats = function() {
        const data = window.exportSiteData();
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dostrochka-stats-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        trackEvent('admin', 'export_data');
        showCustomAlert('Статистика экспортирована в JSON файл!');
    };
    
    window.clearSiteData = function() {
        if (confirm('Очистить ВСЕ данные сайта? Это удалит лайки, комментарии и статистику.')) {
            localStorage.clear();
            showCustomAlert('Все данные очищены. Страница будет перезагружена.');
            setTimeout(() => location.reload(), 1500);
            trackEvent('admin', 'clear_data');
        }
    };
    
    // Добавляем глобальные функции для отладки
    if (SITE_CONFIG.DEBUG) {
        console.log('🔧 Режим отладки включен');
        console.log('Доступные команды:');
        console.log('  exportSiteData() - посмотреть статистику');
        console.log('  downloadSiteStats() - скачать статистику в файл');
        console.log('  clearSiteData() - очистить все данные');
    }
    
    // === АВТОМАТИЧЕСКОЕ РЕЗЕРВНОЕ КОПИРОВАНИЕ ===
    if (SITE_CONFIG.BACKUP?.ENABLE_AUTO_BACKUP) {
        const lastBackup = localStorage.getItem('lastAutoBackup');
        const now = Date.now();
        const backupInterval = (SITE_CONFIG.BACKUP.BACKUP_INTERVAL_HOURS || 24) * 60 * 60 * 1000;
        
        if (!lastBackup || (now - parseInt(lastBackup)) > backupInterval) {
            const backup = window.exportSiteData();
            localStorage.setItem('site_backup_' + new Date().toISOString().split('T')[0], JSON.stringify(backup));
            localStorage.setItem('lastAutoBackup', now.toString());
            
            if (SITE_CONFIG.DEBUG) {
                console.log('💾 Автоматическое резервное копирование выполнено');
            }
        }
    }
});

// === СТИЛИ ДЛЯ УВЕДОМЛЕНИЙ ===
const alertStyles = document.createElement('style');
alertStyles.textContent = `
    .custom-alert {
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--gradient-primary);
        color: var(--dark-1);
        padding: 1rem 1.5rem;
        border-radius: 15px;
        box-shadow: var(--shadow-glow);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 400px;
    }
    
    .custom-alert.alert-error {
        background: var(--gradient-secondary);
    }
    
    .custom-alert.show {
        transform: translateX(0);
    }
    
    .alert-content {
        display: flex;
        align-items: center;
        gap: 0.8rem;
    }
    
    .alert-content i {
        font-size: 1.5rem;
    }
    
    .alert-content p {
        margin: 0;
        font-weight: 600;
        font-size: 0.9rem;
    }
`;
document.head.appendChild(alertStyles);
