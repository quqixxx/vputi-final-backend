// vputi-backend/server.js

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const querystring = require('querystring'); 

const app = express();
const PORT = process.env.PORT || 3001;

// Конфигурация
const TRAVELPAYOUTS_API_TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN;
const YOUR_PARTNER_MARKER = '636492'; 
const TRS_VALUE = '422197';
const P_VALUE_AVIASALES = '4114';     
const P_VALUE_HOTELLOOK = '4115';
const P_VALUE_TRAVELATA = '771'; // Из документации Travelata
const CAMPAIGN_ID_AVIASALES = '100';
const CAMPAIGN_ID_HOTELLOOK = '101';
const CAMPAIGN_ID_TRAVELATA = '18'; // Из документации Travelata

// Настройка CORS 
const allowedOrigins = [
  'http://localhost:5173',
  'https://visitruu.vercel.app',
  'https://app-puce-omega.vercel.app',
  'https://app-quqixs-projects.vercel.app' 
];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};
app.use(cors(corsOptions)); 
app.use(express.json());

// --- СТАРЫЕ РАБОЧИЕ МАРШРУТЫ (без изменений) ---
app.get('/', (req, res) => res.send('Привет! Бэкенд "ВПути.ру" запущен!'));
app.get('/api/test-flight-prices', async (req, res) => { /* ... код без изменений ... */ });
app.post('/api/generate-flight-deeplink', (req, res) => { /* ... код без изменений ... */ });
app.get('/api/suggest-places-autocomplete', async (req, res) => { /* ... код без изменений ... */ });
app.post('/api/generate-hotel-deeplink', (req, res) => { /* ... код без изменений ... */ });

// === НАЧАЛО НОВОГО КОДА ===
// НОВЫЙ МАРШРУТ для получения списка самых дешевых туров от Travelata
app.get('/api/get-cheapest-tours', async (req, res) => {
    const travelataApiUrl = 'https://api-gateway.travelata.ru/statistic/cheapestTours';
    try {
        console.log(`Запрос к Travelata API: ${travelataApiUrl}`);
        const response = await axios.get(travelataApiUrl, {
            params: {
                departureCity: 2, // 2 = Москва, для примера
                'checkInDateRange[from]': '2025-07-01', // Указываем будущие даты
                'checkInDateRange[to]': '2025-07-31',
                'nightRange[from]': 7,
                'nightRange[to]': 14,
                'touristGroup[adults]': 2
            },
            timeout: 15000 
        }); 
        console.log("Ответ от Travelata API (дешевые туры) получен успешно!");
        res.json(response.data); 
    } catch (error) {
        const errorMessage = error.response ? `Статус: ${error.response.status}, Тело ответа: ${JSON.stringify(error.response.data)}` : `Ошибка Axios: ${error.message}`;
        console.error('Ошибка при запросе к Travelata API:', errorMessage);
        res.status(500).json({ message: 'Ошибка при получении списка туров.' });
    } 
});

// НОВЫЙ МАРШРУТ для генерации deeplink для туров Travelata
app.post('/api/generate-tour-deeplink', (req, res) => {
    const { tour_page_url } = req.body;
    if (!tour_page_url) { return res.status(400).json({ message: 'Параметр "tour_page_url" обязателен.' }); }
    
    const encodedTargetUrl = encodeURIComponent(tour_page_url);
    const affiliateDeeplinkParams = {
        marker: YOUR_PARTNER_MARKER, 
        trs: TRS_VALUE, 
        p: P_VALUE_TRAVELATA,
        u: encodedTargetUrl, 
        campaign_id: CAMPAIGN_ID_TRAVELATA
    };
    const affiliateDeeplink = `https://tp.media/r?${querystring.stringify(affiliateDeeplinkParams)}`;
    console.log('Сгенерирован Deeplink для Travelata:', affiliateDeeplink);
    res.json({ success: true, deeplink: affiliateDeeplink });
});
// === КОНЕЦ НОВОГО КОДА ===


// --- Запуск сервера ---
app.listen(PORT, () => { 
    console.log(`+++ Server is now listening on port: ${PORT} +++`);
    if (!process.env.TRAVELPAYOUTS_API_TOKEN) {
        console.warn('!!! WARNING: TRAVELPAYOUTS_API_TOKEN is not set. !!!');
    } else {
        console.log('--- API Token is loaded from environment variables. ---');
    }
    console.log('--- VPUTI.RU Backend Ready ---');
});