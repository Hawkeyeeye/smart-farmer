const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

// Load environment variables
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not available - using default values');
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuration
const CONFIG = {
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || 'demo_key',
  UPDATE_INTERVAL: 120000, // 2 minutes
  PORT: process.env.PORT || 3000,
  DEFAULT_LOCATION: {
  lat: parseFloat(process.env.LATITUDE) || 12.9716,  // ← Bangalore coordinates
  lon: parseFloat(process.env.LONGITUDE) || 77.5946, // ← Bangalore coordinates
  city: process.env.CITY || 'Bangalore'              // ← CORRECTED SPELLING
}
};

class SmartFarmingDataService {
  constructor() {
    this.cachedData = {
      weather: null,
      soil: null,
      forecast: null,
      lastUpdate: null
    };
    this.historicalData = {
      temperature: [],
      humidity: [],
      soilMoisture: [],
      timestamps: []
    };
    this.cropData = this.loadCropData();
  }

  loadCropData() {
    return {
      cropType: 'wheat',
      plantingDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      expectedHarvestDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
      fieldSize: 2.5,
      variety: 'HD-2967'
    };
  }

  async getCurrentWeather() {
    try {
      if (CONFIG.OPENWEATHER_API_KEY === 'demo_key') {
        return this.generateMockWeatherData();
      }

      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather`,
        {
          params: {
            lat: CONFIG.DEFAULT_LOCATION.lat,
            lon: CONFIG.DEFAULT_LOCATION.lon,
            appid: CONFIG.OPENWEATHER_API_KEY,
            units: 'metric'
          },
          timeout: 5000
        }
      );

      const data = response.data;
      return {
        temperature: Math.round(data.main.temp * 10) / 10,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind?.speed || 0,
        windDirection: data.wind?.deg || 0,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        visibility: data.visibility / 1000,
        uvIndex: Math.round(Math.random() * 10),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Weather API Error:', error.message);
      return this.generateMockWeatherData();
    }
  }

  async getSoilData() {
    try {
      const weather = await this.getCurrentWeather();
      
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
      const seasonalFactor = Math.sin((dayOfYear / 365) * 2 * Math.PI) * 0.3;
      
      let baseMoisture = 40 + seasonalFactor * 20;
      
      if (weather.humidity > 70) baseMoisture += 10;
      if (weather.humidity < 40) baseMoisture -= 8;
      if (weather.description.includes('rain')) baseMoisture += 25;
      if (weather.description.includes('clear') && weather.temperature > 30) baseMoisture -= 12;
      
      const moisture = Math.max(5, Math.min(85, baseMoisture + (Math.random() - 0.5) * 8));
      const soilTemp = weather.temperature * 0.8 + 5 + (Math.random() - 0.5) * 3;
      const ph = 6.5 + (moisture - 40) * 0.01 + (Math.random() - 0.5) * 0.6;
      
      const daysSincePlanting = Math.floor((Date.now() - this.cropData.plantingDate) / (1000 * 60 * 60 * 24));
      const nitrogen = Math.max(20, 80 - daysSincePlanting * 0.5 + (Math.random() - 0.5) * 15);
      const phosphorus = Math.max(15, 60 - daysSincePlanting * 0.3 + (Math.random() - 0.5) * 10);
      const potassium = Math.max(25, 75 - daysSincePlanting * 0.4 + (Math.random() - 0.5) * 12);

      return {
        moisture: Math.round(moisture * 10) / 10,
        temperature: Math.round(soilTemp * 10) / 10,
        ph: Math.round(ph * 100) / 100,
        nitrogen: Math.round(nitrogen),
        phosphorus: Math.round(phosphorus),
        potassium: Math.round(potassium),
        conductivity: Math.round((0.8 + Math.random() * 0.4) * 100) / 100,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Soil data calculation error:', error);
      return this.generateMockSoilData();
    }
  }

  async getWeatherForecast() {
    try {
      if (CONFIG.OPENWEATHER_API_KEY === 'demo_key') {
        return this.generateMockForecast();
      }

      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast`,
        {
          params: {
            lat: CONFIG.DEFAULT_LOCATION.lat,
            lon: CONFIG.DEFAULT_LOCATION.lon,
            appid: CONFIG.OPENWEATHER_API_KEY,
            units: 'metric',
            cnt: 40
          },
          timeout: 8000
        }
      );

      const dailyData = {};
      
      response.data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayKey = date.toDateString();
        
        if (!dailyData[dayKey]) {
          dailyData[dayKey] = {
            temps: [],
            humidity: [],
            rainfall: 0,
            windSpeed: [],
            date: date,
            descriptions: []
          };
        }
        
        dailyData[dayKey].temps.push(item.main.temp);
        dailyData[dayKey].humidity.push(item.main.humidity);
        dailyData[dayKey].windSpeed.push(item.wind?.speed || 0);
        dailyData[dayKey].descriptions.push(item.weather[0].description);
        
        if (item.rain && item.rain['3h']) {
          dailyData[dayKey].rainfall += item.rain['3h'];
        }
      });

      return Object.values(dailyData).slice(0, 7).map((day, index) => ({
        date: day.date.toLocaleDateString('en', { weekday: 'short' }),
        fullDate: day.date.toISOString().split('T')[0],
        temperature: {
          avg: Math.round(day.temps.reduce((a, b) => a + b) / day.temps.length),
          min: Math.round(Math.min(...day.temps)),
          max: Math.round(Math.max(...day.temps))
        },
        humidity: Math.round(day.humidity.reduce((a, b) => a + b) / day.humidity.length),
        rainfall: Math.round(day.rainfall * 10) / 10,
        windSpeed: Math.round((day.windSpeed.reduce((a, b) => a + b) / day.windSpeed.length) * 10) / 10,
        description: this.getMostCommonDescription(day.descriptions),
        dayIndex: index
      }));
    } catch (error) {
      console.error('Forecast API Error:', error.message);
      return this.generateMockForecast();
    }
  }

  getMostCommonDescription(descriptions) {
    const counts = {};
    descriptions.forEach(desc => counts[desc] = (counts[desc] || 0) + 1);
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  async getCropHealth() {
    const weather = await this.getCurrentWeather();
    const soil = await this.getSoilData();
    const daysSincePlanting = Math.floor((Date.now() - this.cropData.plantingDate) / (1000 * 60 * 60 * 24));
    
    let healthScore = 70;
    const factors = {};
    const recommendations = [];

    if (weather.temperature >= 15 && weather.temperature <= 25) {
      healthScore += 15;
      factors.temperature = { status: 'optimal', value: weather.temperature };
    } else if (weather.temperature < 10 || weather.temperature > 35) {
      healthScore -= 20;
      factors.temperature = { status: 'critical', value: weather.temperature };
      recommendations.push({
        type: 'temperature',
        priority: 'HIGH',
        message: `Temperature ${weather.temperature}°C is outside optimal range (15-25°C)`,
        action: weather.temperature > 35 ? 'Consider shade nets or cooling systems' : 'Protect crops from cold stress'
      });
    } else {
      healthScore += 5;
      factors.temperature = { status: 'moderate', value: weather.temperature };
    }

    if (soil.moisture >= 30 && soil.moisture <= 60) {
      healthScore += 15;
      factors.soilMoisture = { status: 'optimal', value: soil.moisture };
    } else if (soil.moisture < 20) {
      healthScore -= 25;
      factors.soilMoisture = { status: 'critical', value: soil.moisture };
      recommendations.push({
        type: 'irrigation',
        priority: 'HIGH',
        message: `Soil moisture critically low at ${soil.moisture}%`,
        action: `Apply ${Math.round((35 - soil.moisture) * 15)}L/m² of water immediately`
      });
    } else if (soil.moisture > 75) {
      healthScore -= 15;
      factors.soilMoisture = { status: 'excessive', value: soil.moisture };
      recommendations.push({
        type: 'drainage',
        priority: 'MEDIUM',
        message: `Soil moisture too high at ${soil.moisture}%`,
        action: 'Check drainage systems and reduce irrigation'
      });
    } else {
      factors.soilMoisture = { status: 'moderate', value: soil.moisture };
    }

    if (soil.ph >= 6.0 && soil.ph <= 7.5) {
      healthScore += 10;
      factors.ph = { status: 'optimal', value: soil.ph };
    } else {
      healthScore -= 10;
      factors.ph = { status: 'suboptimal', value: soil.ph };
      recommendations.push({
        type: 'soil',
        priority: 'MEDIUM',
        message: `Soil pH ${soil.ph} outside optimal range (6.0-7.5)`,
        action: soil.ph < 6.0 ? 'Apply lime to increase pH' : 'Apply sulfur or organic matter to decrease pH'
      });
    }

    if (soil.nitrogen < 40) {
      healthScore -= 15;
      recommendations.push({
        type: 'fertilizer',
        priority: 'HIGH',
        message: `Low nitrogen levels (${soil.nitrogen}%)`,
        action: 'Apply nitrogen-rich fertilizer (urea 46-0-0) at 120kg/ha'
      });
    }

    const growthStage = this.getGrowthStage(daysSincePlanting);
    factors.growthStage = growthStage;

    return {
      score: Math.max(0, Math.min(100, Math.round(healthScore))),
      factors,
      recommendations,
      growthStage: growthStage.stage,
      daysFromPlanting: daysSincePlanting,
      expectedHarvest: Math.max(0, Math.floor((this.cropData.expectedHarvestDate - Date.now()) / (1000 * 60 * 60 * 24))),
      timestamp: new Date().toISOString()
    };
  }

  getGrowthStage(days) {
    if (days < 15) return { stage: 'Germination', progress: (days / 15) * 100, optimal: days >= 7 };
    if (days < 45) return { stage: 'Vegetative', progress: ((days - 15) / 30) * 100, optimal: days >= 20 };
    if (days < 75) return { stage: 'Reproductive', progress: ((days - 45) / 30) * 100, optimal: days >= 50 };
    if (days < 120) return { stage: 'Maturation', progress: ((days - 75) / 45) * 100, optimal: days >= 90 };
    return { stage: 'Ready for Harvest', progress: 100, optimal: true };
  }

  async predictYield() {
    const cropHealth = await this.getCropHealth();
    const weather = await this.getCurrentWeather();
    const soil = await this.getSoilData();
    
    let baseYield = 4500;
    const healthMultiplier = cropHealth.score / 100;
    
    let weatherMultiplier = 1.0;
    if (weather.temperature >= 15 && weather.temperature <= 25) weatherMultiplier += 0.1;
    if (weather.temperature < 10 || weather.temperature > 35) weatherMultiplier -= 0.2;
    
    let soilMultiplier = 1.0;
    if (soil.moisture >= 30 && soil.moisture <= 60) soilMultiplier += 0.1;
    if (soil.ph >= 6.0 && soil.ph <= 7.5) soilMultiplier += 0.05;
    if (soil.nitrogen > 60) soilMultiplier += 0.1;
    
    const predictedYield = baseYield * healthMultiplier * weatherMultiplier * soilMultiplier;
    
    return {
      predicted: Math.round(predictedYield),
      perHectare: Math.round(predictedYield),
      totalField: Math.round(predictedYield * this.cropData.fieldSize),
      confidence: Math.round((healthMultiplier * 0.7 + 0.3) * 100),
      factors: {
        health: Math.round(healthMultiplier * 100),
        weather: Math.round(weatherMultiplier * 100),
        soil: Math.round(soilMultiplier * 100)
      }
    };
  }

  generateMockWeatherData() {
    const temp = 18 + Math.random() * 20;
    return {
      temperature: Math.round(temp * 10) / 10,
      humidity: Math.round(35 + Math.random() * 50),
      pressure: Math.round(1000 + Math.random() * 50),
      windSpeed: Math.round(Math.random() * 15 * 10) / 10,
      windDirection: Math.round(Math.random() * 360),
      description: ['clear sky', 'few clouds', 'scattered clouds', 'broken clouds', 'light rain'][Math.floor(Math.random() * 5)],
      icon: '01d',
      visibility: Math.round((5 + Math.random() * 15) * 10) / 10,
      uvIndex: Math.round(Math.random() * 10),
      timestamp: new Date().toISOString()
    };
  }

  generateMockSoilData() {
    return {
      moisture: Math.round((25 + Math.random() * 40) * 10) / 10,
      temperature: Math.round((15 + Math.random() * 15) * 10) / 10,
      ph: Math.round((6.0 + Math.random() * 2.0) * 100) / 100,
      nitrogen: Math.round(30 + Math.random() * 50),
      phosphorus: Math.round(20 + Math.random() * 40),
      potassium: Math.round(40 + Math.random() * 40),
      conductivity: Math.round((0.5 + Math.random() * 1.0) * 100) / 100,
      timestamp: new Date().toISOString()
    };
  }

  generateMockForecast() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map((day, index) => {
      const baseTemp = 20 + Math.sin(index / 7 * Math.PI) * 8;
      return {
        date: day,
        fullDate: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        temperature: {
          avg: Math.round(baseTemp),
          min: Math.round(baseTemp - 5),
          max: Math.round(baseTemp + 5)
        },
        humidity: Math.round(40 + Math.random() * 40),
        rainfall: Math.round(Math.random() * 10 * 10) / 10,
        windSpeed: Math.round(Math.random() * 10 * 10) / 10,
        description: ['clear sky', 'few clouds', 'light rain'][Math.floor(Math.random() * 3)],
        dayIndex: index
      };
    });
  }

  updateHistoricalData(weather, soil) {
    const maxPoints = 50;
    
    this.historicalData.timestamps.push(new Date().toISOString());
    this.historicalData.temperature.push(weather.temperature);
    this.historicalData.humidity.push(weather.humidity);
    this.historicalData.soilMoisture.push(soil.moisture);
    
    Object.keys(this.historicalData).forEach(key => {
      if (this.historicalData[key].length > maxPoints) {
        this.historicalData[key] = this.historicalData[key].slice(-maxPoints);
      }
    });
  }
}

const dataService = new SmartFarmingDataService();

// API Routes
app.get('/api/current-data', async (req, res) => {
  try {
    const [weather, soil, cropHealth, yieldPrediction] = await Promise.all([
      dataService.getCurrentWeather(),
      dataService.getSoilData(),
      dataService.getCropHealth(),
      dataService.predictYield()
    ]);
    
    dataService.updateHistoricalData(weather, soil);
    
    res.json({
      weather,
      soil,
      cropHealth,
      yieldPrediction,
      historical: dataService.historicalData,
      location: CONFIG.DEFAULT_LOCATION,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Current data error:', error);
    res.status(500).json({ error: 'Failed to fetch current data', details: error.message });
  }
});

app.get('/api/forecast', async (req, res) => {
  try {
    const forecast = await dataService.getWeatherForecast();
    res.json({
      forecast,
      location: CONFIG.DEFAULT_LOCATION,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: 'Failed to fetch forecast data', details: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// WebSocket connections
const connectedClients = new Set();

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  connectedClients.add(socket.id);
  
  sendDataToClient(socket);
  
  socket.on('requestUpdate', () => {
    sendDataToClient(socket);
  });
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    connectedClients.delete(socket.id);
  });
});

async function sendDataToClient(socket) {
  try {
    const [weather, soil, cropHealth, forecast, yieldPrediction] = await Promise.all([
      dataService.getCurrentWeather(),
      dataService.getSoilData(),
      dataService.getCropHealth(),
      dataService.getWeatherForecast(),
      dataService.predictYield()
    ]);
    
    dataService.updateHistoricalData(weather, soil);
    
    socket.emit('dataUpdate', {
      weather,
      soil,
      cropHealth,
      forecast,
      yieldPrediction,
      historical: dataService.historicalData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('WebSocket data error:', error);
    socket.emit('error', { message: 'Failed to fetch data', details: error.message });
  }
}

// Broadcast updates to all clients periodically
setInterval(async () => {
  if (connectedClients.size > 0) {
    try {
      const [weather, soil, cropHealth, forecast, yieldPrediction] = await Promise.all([
        dataService.getCurrentWeather(),
        dataService.getSoilData(),
        dataService.getCropHealth(),
        dataService.getWeatherForecast(),
        dataService.predictYield()
      ]);
      
      dataService.updateHistoricalData(weather, soil);
      
      io.emit('dataUpdate', {
        weather,
        soil,
        cropHealth,
        forecast,
        yieldPrediction,
        historical: dataService.historicalData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Broadcast error:', error);
    }
  }
}, CONFIG.UPDATE_INTERVAL);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Server startup
server.listen(CONFIG.PORT, () => {
  console.log(`🌱 Smart Farming Dashboard Server running on port ${CONFIG.PORT}`);
  console.log(`📍 Location: ${CONFIG.DEFAULT_LOCATION.city} (${CONFIG.DEFAULT_LOCATION.lat}, ${CONFIG.DEFAULT_LOCATION.lon})`);
  console.log(`🔑 OpenWeather API: ${CONFIG.OPENWEATHER_API_KEY !== 'demo_key' ? 'Connected' : 'Demo Mode'}`);
  console.log(`📊 Dashboard: http://localhost:${CONFIG.PORT}`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
