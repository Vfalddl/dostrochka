// config.js - Конфигурация сайта DOSТРОЧКА
// ЗАМЕНИТЕ ВСЕ ЗНАЧЕНИЯ НА СВОИ!

const CONFIG = {
    // ============================================
    // 1. GOOGLE ANALYTICS
    // ============================================
    // Получите ID на https://analytics.google.com
    GA_ID: 'G-XXXXXXXXXX',
    
    // ============================================
    // 2. GOOGLE FORMS ДЛЯ СТАТИСТИКИ
    // ============================================
    // Создайте форму на https://forms.google.com
    // Добавьте поля: Тип события, ID стиха, Название, Время
    STATS_FORM_URL: 'https://docs.google.com/forms/d/e/XXXXXXXXXX/formResponse',
    // Entry ID поля "Тип события" (посмотрите в HTML формы)
    STATS_FORM_ENTRY: 'entry.XXXXXXXXXX',
    
    // ============================================
    // 3. GOOGLE FORMS ДЛЯ КОНТАКТОВ
    // ============================================
    // Создайте вторую форму для сообщений
    CONTACT_FORM_URL: 'https://docs.google.com/forms/d/e/XXXXXXXXXX/formResponse',
    CONTACT_FORM_ENTRIES: {
        name: 'entry.XXXXXXXXXX',     // Entry ID поля "Имя"
        email: 'entry.XXXXXXXXXX',    // Entry ID поля "Email"
        message: 'entry.XXXXXXXXXX'   // Entry ID поля "Сообщение"
    },
    
    // ============================================
    // 4. НАСТРОЙКИ САЙТА
    // ============================================
    SITE_NAME: 'DOSТРОЧКА',
    SITE_URL: 'https://ваш-логин.github.io/dostrochka',
    SITE_DOMAIN: 'dostrochka.ru', // Если купите домен
    
    // ============================================
    // 5. НАСТРОЙКИ СТАТИСТИКИ
    // ============================================
    STATS_UPDATE_INTERVAL: 30, // секунды
    SEND_STATS_EVERY_HOUR: true,
    
    // ============================================
    // 6. ЭЛЕКТРОННАЯ ПОЧТА ДЛЯ УВЕДОМЛЕНИЙ
    // ============================================
    NOTIFICATION_EMAIL: 'maks.khudyakov.04@bk.ru',
    
    // ============================================
    // 7. СОЦИАЛЬНЫЕ СЕТИ
    // ============================================
    SOCIAL: {
        VK: 'https://vk.com/club232600558',
        TIKTOK: 'https://www.tiktok.com/@dos52896',
        INSTAGRAM: 'https://www.instagram.com/dostrochka'
    },
    
    // ============================================
    // 8. ФУНКЦИИ САЙТА
    // ============================================
    FEATURES: {
        ENABLE_STATS: true,
        ENABLE_CONTACT_FORM: true,
        ENABLE_COMMENTS: true,
        ENABLE_LIKES: true,
        ENABLE_NEWSLETTER: true,
        ENABLE_VIDEOS: true
    },
    
    // ============================================
    // 9. РЕЗЕРВНОЕ КОПИРОВАНИЕ
    // ============================================
    BACKUP: {
        ENABLE_AUTO_BACKUP: true,
        BACKUP_INTERVAL_HOURS: 24,
        MAX_LOCAL_EVENTS: 1000,
        MAX_LOCAL_MESSAGES: 100
    },
    
    // ============================================
    // 10. ОТЛАДКА
    // ============================================
    DEBUG: true, // Включить логи в консоль
    
    // ============================================
    // 11. ВЕРСИЯ КОНФИГА
    // ============================================
    VERSION: '1.0.0',
    LAST_UPDATED: '2025-01-15'
};

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}