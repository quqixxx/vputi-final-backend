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
const CAMPAIGN_ID_AVIASALES = '100';
const CAMPAIGN_ID_HOTELLOOK = '101';

// Настройка CORS. Адрес фронтенда мы добавим сюда на самом последнем шаге.
const allowedOrigins = [
  'http://localhost:5173',
  'https://vputi.vercel.app' // <<< Вставь сюда ссылку из Этапа 2
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

// Маршруты API
app.get('/', (req, res) => res.send('Привет! Бэкенд "ВПути.ру" запущен!'));

app.get('/api/suggest-places-autocomplete', async (req, res) => {
    if (!TRAVELPAYOUTS_API_TOKEN) return res.status(500).json({ message: 'API токен не настроен.' });
    if (!req.query.term) return res.status(400).json({ message: 'Параметр "term" обязателен.' });
    try {
        const response = await axios.get(`https://api.travelpayouts.com/data/ru/cities.json`, { params: { token: TRAVELPAYOUTS_API_TOKEN } });
        const suggestions = response.data.filter(city => city.name && city.name.toLowerCase().startsWith(req.query.term.toLowerCase())).slice(0, 7);
        res.json(suggestions);
    } catch (error) { res.status(500).json({ message: 'Ошибка получения списка городов.' }); }
});

app.get('/api/test-flight-prices', async (req, res) => {
    if (!TRAVELPAYOUTS_API_TOKEN) { return res.status(500).json({ message: 'API токен не настроен.' }); } 
    const { origin, destination, departure_at } = req.query;
    if (!origin || !destination || !departure_at) { return res.status(400).json({ message: 'Необходимы параметры origin, destination и departure_at' }); }
    try {
        const response = await axios.get(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates`, {
            params: { ...req.query, token: TRAVELPAYOUTS_API_TOKEN },
            timeout: 15000 
        }); 
        res.json(response.data); 
    } catch (error) { res.status(500).json({ message: 'Сервер-партнер не отвечает. Попробуйте позже.' }); } 
});

app.post('/api/generate-flight-deeplink', (req, res) => {
    const { aviasales_relative_link } = req.body; 
    if (!aviasales_relative_link) { return res.status(400).json({ message: 'Параметр "aviasales_relative_link" обязателен.' }); }
    const targetUrl = `https://www.aviasales.ru${aviasales_relative_link}`; 
    const deeplinkParams = { marker: YOUR_PARTNER_MARKER, trs: TRS_VALUE, p: P_VALUE_AVIASALES, u: encodeURIComponent(targetUrl), campaign_id: CAMPAIGN_ID_AVIASALES };
    res.json({ success: true, deeplink: `https://tp.media/r?${querystring.stringify(deeplinkParams)}` });
});

app.post('/api/generate-hotel-deeplink', (req, res) => {
    const { cityId, destinationName, checkIn, checkOut, adults } = req.body;
    if (!cityId || !checkIn || !checkOut || !adults) { return res.status(400).json({ message: 'Не все обязательные параметры были переданы.' }); }
    const hotellookTargetParams = { adults, checkIn, checkOut, cityId, currency: 'rub', destination: destinationName, language: 'ru', marker: `${YOUR_PARTNER_MARKER}._hotels` };
    const targetUrl = `https://search.hotellook.com/hotels?${querystring.stringify(hotellookTargetParams)}`;
    const deeplinkParams = { marker: YOUR_PARTNER_MARKER, trs: TRS_VALUE, p: P_VALUE_HOTELLOOK, u: encodeURIComponent(targetUrl), campaign_id: CAMPAIGN_ID_HOTELLOOK };
    res.json({ success: true, deeplink: `https://tp.media/r?${querystring.stringify(deeplinkParams)}` });
});

// Запуск сервера
app.listen(PORT, () => console.log(`--- VPUTI.RU Backend Ready on port ${PORT} ---`));