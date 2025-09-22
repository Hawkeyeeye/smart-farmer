// Smart Farming Dashboard - Complete Working Version
class SmartFarmingDashboard {
  constructor() {
    this.socket = null;
    this.charts = {};
    this.data = {
      current: null,
      historical: null,
      forecast: null
    };
    this.settings = {
      updateInterval: 2,
      temperatureUnit: 'celsius',
      notifications: true
    };
    this.isServerMode = false;
    this.chartsAvailable = window.CHARTS_AVAILABLE || false;
    this.socketAvailable = window.IO_AVAILABLE || false;
    
    console.log('📊 Charts available:', this.chartsAvailable);
    console.log('🔌 Socket.IO available:', this.socketAvailable);
    
    this.init();
  }

  async init() {
    try {
      console.log('🚀 Initializing Smart Farming Dashboard...');
      
      // Show loading screen
      this.showLoading(true);
      
      // Check if we're running through server or file://
      this.checkRunningMode();
      
      // Initialize WebSocket connection (only in server mode)
      if (this.isServerMode && this.socketAvailable) {
        await this.initializeSocket();
      } else {
        console.warn('🔧 Running in demo mode - start the server for real-time features');
        this.showNotification('Demo Mode: Limited functionality', 'warning', 3000);
      }
      
      // Initialize charts if available
      if (this.chartsAvailable) {
        this.initializeAllCharts();
      } else {
        this.hideChartElements();
        this.showNotification('Charts unavailable - data displayed as text', 'info', 4000);
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load settings
      this.loadSettings();
      
      // Update date/time
      this.updateDateTime();
      setInterval(() => this.updateDateTime(), 60000);
      
      // Fetch initial data
      await this.fetchInitialData();
      
      // Hide loading screen
      this.showLoading(false);
      
      console.log('✅ Smart Farming Dashboard initialized successfully');
    } catch (error) {
      console.error('Initialization error:', error);
      this.showNotification('Dashboard loaded with limited functionality', 'warning');
      this.showLoading(false);
      
      // Load demo data as fallback
      this.loadDemoData();
    }
  }

  checkRunningMode() {
    this.isServerMode = window.location.protocol === 'http:' || window.location.protocol === 'https:';
    
    if (!this.isServerMode) {
      console.warn('⚠️ Running in file mode. Start the Node.js server for full functionality.');
    }
  }

  showLoading(show) {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.style.display = show ? 'flex' : 'none';
    }
  }

  hideChartElements() {
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
      const canvas = container.querySelector('canvas');
      if (canvas) {
        canvas.style.display = 'none';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'chart-text-alternative';
        textDiv.innerHTML = '<p>📊 Chart data will be displayed here when Chart.js loads</p>';
        container.appendChild(textDiv);
      }
    });
  }

  async initializeSocket() {
    if (!this.socketAvailable) {
      console.warn('Socket.IO not available');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = io();
        
        this.socket.on('connect', () => {
          console.log('🔌 Connected to server');
          this.updateConnectionStatus('connected');
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('🔌 Disconnected from server');
          this.updateConnectionStatus('disconnected');
        });

        this.socket.on('dataUpdate', (data) => {
          console.log('📡 Received real-time data update');
          this.handleDataUpdate(data);
        });

        this.socket.on('error', (error) => {
          console.error('Socket error:', error);
          this.showNotification(error.message, 'error');
        });

        setTimeout(() => {
          if (!this.socket.connected) {
            reject(new Error('Failed to connect to server'));
          }
        }, 5000);

      } catch (error) {
        console.error('Socket initialization error:', error);
        reject(error);
      }
    });
  }

  updateConnectionStatus(status) {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
      statusElement.textContent = status === 'connected' ? 'Connected' : 'Disconnected';
      statusElement.className = `connection-status ${status}`;
    }
  }

  async fetchInitialData() {
    try {
      if (this.isServerMode) {
        console.log('📡 Fetching data from server APIs...');
        
        const [currentResponse, forecastResponse] = await Promise.all([
          fetch('/api/current-data').catch(() => null),
          fetch('/api/forecast').catch(() => null)
        ]);

        if (currentResponse && currentResponse.ok && forecastResponse && forecastResponse.ok) {
          const currentData = await currentResponse.json();
          const forecastData = await forecastResponse.json();

          console.log('✅ Real API data received:', currentData);

          this.handleDataUpdate({
            ...currentData,
            forecast: forecastData.forecast
          });

          this.showNotification('✅ Real weather & sensor data loaded!', 'success', 4000);
          return;
        }
      }
      
      console.log('🔄 Loading demo data...');
      this.loadDemoData();
      
    } catch (error) {
      console.error('Error fetching initial data:', error);
      this.showNotification('Loading demo data', 'info');
      this.loadDemoData();
    }
  }

  loadDemoData() {
    console.log('🎭 Generating realistic demo data...');
    
    const demoData = {
      weather: {
        temperature: 25 + Math.random() * 10,
        humidity: 50 + Math.random() * 30,
        pressure: 1013,
        windSpeed: Math.random() * 10,
        windDirection: Math.random() * 360,
        description: 'partly cloudy',
        icon: '02d',
        visibility: 10,
        uvIndex: 6,
        timestamp: new Date().toISOString()
      },
      soil: {
        moisture: 35 + Math.random() * 25,
        temperature: 20 + Math.random() * 10,
        ph: 6.5 + (Math.random() - 0.5) * 1,
        nitrogen: 50 + Math.random() * 30,
        phosphorus: 40 + Math.random() * 30,
        potassium: 55 + Math.random() * 25,
        conductivity: 1.2,
        timestamp: new Date().toISOString()
      },
      cropHealth: {
        score: 70 + Math.random() * 25,
        factors: {
          temperature: { status: 'optimal', value: 25 },
          soilMoisture: { status: 'optimal', value: 45 },
          ph: { status: 'optimal', value: 6.8 },
          humidity: { status: 'moderate', value: 65 }
        },
        recommendations: [
          {
            type: 'irrigation',
            priority: 'MEDIUM',
            message: 'Monitor soil moisture levels',
            action: 'Check irrigation schedule in 2-3 days'
          }
        ],
        growthStage: 'Vegetative',
        daysFromPlanting: 45,
        expectedHarvest: 75,
        timestamp: new Date().toISOString()
      },
      yieldPrediction: {
        predicted: 4200,
        perHectare: 4200,
        totalField: 10500,
        confidence: 85,
        factors: {
          health: 85,
          weather: 80,
          soil: 90
        }
      },
      forecast: [
        { date: 'Mon', temperature: { avg: 26, min: 20, max: 32 }, humidity: 65, rainfall: 0, description: 'clear sky' },
        { date: 'Tue', temperature: { avg: 24, min: 18, max: 30 }, humidity: 70, rainfall: 2, description: 'light rain' },
        { date: 'Wed', temperature: { avg: 27, min: 21, max: 33 }, humidity: 60, rainfall: 0, description: 'partly cloudy' },
        { date: 'Thu', temperature: { avg: 25, min: 19, max: 31 }, humidity: 68, rainfall: 5, description: 'scattered clouds' },
        { date: 'Fri', temperature: { avg: 23, min: 17, max: 29 }, humidity: 75, rainfall: 8, description: 'light rain' },
        { date: 'Sat', temperature: { avg: 26, min: 20, max: 32 }, humidity: 62, rainfall: 0, description: 'clear sky' },
        { date: 'Sun', temperature: { avg: 28, min: 22, max: 34 }, humidity: 58, rainfall: 0, description: 'clear sky' }
      ],
      historical: {
        timestamps: Array.from({length: 20}, (_, i) => new Date(Date.now() - i * 60000).toISOString()),
        temperature: Array.from({length: 20}, () => 22 + Math.random() * 8),
        humidity: Array.from({length: 20}, () => 55 + Math.random() * 20),
        soilMoisture: Array.from({length: 20}, () => 40 + Math.random() * 15)
      },
      location: { city: 'Demo Location', lat: 28.6139, lon: 77.2090 },
      timestamp: new Date().toISOString()
    };

    this.handleDataUpdate(demoData);
    this.showNotification('🎭 Demo data loaded - All features working!', 'info', 4000);
  }

  handleDataUpdate(data) {
    console.log('📊 Updating dashboard with data...');
    
    this.data.current = data;
    
    // Update all sections
    this.updateOverviewCards(data);
    this.updateSensorData(data);
    this.updateWeatherData(data);
    this.updateIrrigationData(data);
    this.updateFertilizerData(data);
    this.updateCropHealthData(data);
    this.updateReportsData(data);
    this.updatePredictionsData(data);
    
    this.populateAllSectionDetails(data);
    // Update last updated time
    this.updateLastUpdateTime();
    
    console.log('✅ Dashboard updated successfully');
  }

  updateLastUpdateTime() {
    const element = document.getElementById('lastUpdate');
    if (element) {
      element.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
  }

  updateOverviewCards(data) {
    if (!data.weather || !data.soil || !data.cropHealth) return;

    // Temperature
    const tempElement = document.getElementById('overviewTemp');
    const tempStatus = document.getElementById('overviewTempStatus');
    if (tempElement) {
      tempElement.textContent = `${Math.round(data.weather.temperature)}°C`;
      if (tempStatus) tempStatus.textContent = this.getTemperatureStatus(data.weather.temperature);
    }

    // Soil Moisture
    const moistureElement = document.getElementById('overviewMoisture');
    const moistureStatus = document.getElementById('overviewMoistureStatus');
    if (moistureElement) {
      moistureElement.textContent = `${data.soil.moisture.toFixed(1)}%`;
      if (moistureStatus) moistureStatus.textContent = this.getMoistureStatus(data.soil.moisture);
    }

    // Crop Health
    const healthElement = document.getElementById('overviewHealth');
    const healthStatus = document.getElementById('overviewHealthStatus');
    if (healthElement) {
      healthElement.textContent = `${Math.round(data.cropHealth.score)}%`;
      if (healthStatus) healthStatus.textContent = this.getHealthStatus(data.cropHealth.score);
    }

    // Predicted Yield
    const yieldElement = document.getElementById('overviewYield');
    const yieldStatus = document.getElementById('overviewYieldStatus');
    if (yieldElement && data.yieldPrediction) {
      yieldElement.textContent = `${data.yieldPrediction.perHectare} kg/ha`;
      if (yieldStatus) yieldStatus.textContent = `${data.yieldPrediction.confidence}% confidence`;
    }

    // Update alerts
    this.updateAlerts(data);
  }

  updateSensorData(data) {
    if (!data.weather || !data.soil) return;

    // Update sensor values
    this.updateElement('sensorTemp', `${Math.round(data.weather.temperature)}°C`);
    this.updateElement('sensorMoisture', `${data.soil.moisture.toFixed(1)}%`);
    this.updateElement('sensorHumidity', `${data.weather.humidity}%`);
    this.updateElement('sensorPH', data.soil.ph.toFixed(2));

    // Update trends
    this.updateTrend('sensorTempTrend', data.weather.temperature, 25);
    this.updateTrend('sensorMoistureTrend', data.soil.moisture, 40);
    this.updateTrend('sensorHumidityTrend', data.weather.humidity, 60);
    this.updateTrend('sensorPHTrend', data.soil.ph, 6.5);

    // Update charts if available
    if (this.chartsAvailable) {
      this.updateSensorCharts(data);
    } else {
      this.updateTextAlternatives(data);
    }
  }

  updateTextAlternatives(data) {
    const alternatives = document.querySelectorAll('.chart-text-alternative');
    alternatives.forEach((alt, index) => {
      switch (index) {
        case 0: // Temperature
          alt.innerHTML = `<p><strong>Current: ${Math.round(data.weather.temperature)}°C</strong><br>Status: ${this.getTemperatureStatus(data.weather.temperature)}</p>`;
          break;
        case 1: // Soil Moisture
          alt.innerHTML = `<p><strong>Current: ${data.soil.moisture.toFixed(1)}%</strong><br>Status: ${this.getMoistureStatus(data.soil.moisture)}</p>`;
          break;
        case 2: // Humidity
          alt.innerHTML = `<p><strong>Current: ${data.weather.humidity}%</strong><br>Trend: Stable</p>`;
          break;
        case 3: // pH
          alt.innerHTML = `<p><strong>Current: ${data.soil.ph.toFixed(2)}</strong><br>Status: ${data.soil.ph >= 6.0 && data.soil.ph <= 7.5 ? 'Optimal' : 'Needs Adjustment'}</p>`;
          break;
        default:
          alt.innerHTML = '<p>📊 Data visualization placeholder</p>';
      }
    });
  }

  updateWeatherData(data) {
    if (!data.weather) return;

    // Current weather
    this.updateElement('currentTemp', `${Math.round(data.weather.temperature)}°C`);
    this.updateElement('weatherDesc', data.weather.description);
    this.updateElement('windSpeed', data.weather.windSpeed.toFixed(1));
    this.updateElement('visibility', data.weather.visibility.toFixed(1));
    this.updateElement('uvIndex', data.weather.uvIndex);

    // Weather icon
    const iconElement = document.getElementById('currentWeatherIcon');
    if (iconElement) {
      iconElement.textContent = this.getWeatherIcon(data.weather.description);
    }

    // Update location
    if (data.location) {
      this.updateElement('locationName', data.location.city);
    }

    // Forecast
    if (data.forecast) {
      this.updateForecast(data.forecast);
    }
  }

  // ... (continuing from updateForecast method)

  updateForecast(forecast) {
    const container = document.getElementById('forecastContainer');
    if (!container) return;

    container.innerHTML = forecast.map(day => `
      <div class="forecast-card">
        <div class="forecast-day">${day.date}</div>
        <div class="forecast-icon">${this.getWeatherIcon(day.description)}</div>
        <div class="forecast-temp">${day.temperature.max}°/${day.temperature.min}°</div>
        <div class="forecast-rain">${day.rainfall}mm</div>
      </div>
    `).join('');
  }

  updateIrrigationData(data) {
    if (!data.soil || !data.cropHealth) return;

    const moisture = data.soil.moisture;
    this.updateElement('irrigationSoilMoisture', `${moisture.toFixed(1)}%`);

    // Update irrigation status
    const statusElement = document.getElementById('irrigationStatus');
    if (statusElement) {
      if (moisture < 25) {
        statusElement.textContent = 'Irrigation Required';
        statusElement.parentElement.querySelector('.indicator-dot').className = 'indicator-dot error';
      } else if (moisture < 40) {
        statusElement.textContent = 'Monitor Closely';
        statusElement.parentElement.querySelector('.indicator-dot').className = 'indicator-dot warning';
      } else {
        statusElement.textContent = 'Optimal Level';
        statusElement.parentElement.querySelector('.indicator-dot').className = 'indicator-dot';
      }
    }

    // Update recommendations
    this.updateRecommendations(data.cropHealth.recommendations, 'irrigationRecommendations');
  }
  populateAllSectionDetails(data) {
  // Populate Sensors Section Details
  if (data.weather && data.soil) {
    this.updateElement('sensorTemp', `${Math.round(data.weather.temperature)}°C`);
    this.updateElement('sensorMoisture', `${data.soil.moisture.toFixed(1)}%`);
    this.updateElement('sensorHumidity', `${data.weather.humidity}%`);
    this.updateElement('sensorPH', data.soil.ph.toFixed(2));
    
    // Update trends
    this.updateTrend('sensorTempTrend', data.weather.temperature, 25);
    this.updateTrend('sensorMoistureTrend', data.soil.moisture, 40);
    this.updateTrend('sensorHumidityTrend', data.weather.humidity, 60);
    this.updateTrend('sensorPHTrend', data.soil.ph, 6.5);
  }
  
  // Populate Weather Section Details
  if (data.weather) {
    this.updateElement('currentTemp', `${Math.round(data.weather.temperature)}°C`);
    this.updateElement('weatherDesc', data.weather.description);
    this.updateElement('windSpeed', data.weather.windSpeed.toFixed(1));
    this.updateElement('visibility', data.weather.visibility.toFixed(1));
    this.updateElement('uvIndex', data.weather.uvIndex);
    
    const iconElement = document.getElementById('currentWeatherIcon');
    if (iconElement) iconElement.textContent = this.getWeatherIcon(data.weather.description);
  }
  
  // Populate Irrigation Section Details
  if (data.soil) {
    this.updateElement('irrigationSoilMoisture', `${data.soil.moisture.toFixed(1)}%`);
    
    const statusElement = document.getElementById('irrigationStatus');
    if (statusElement) {
      if (data.soil.moisture < 25) {
        statusElement.textContent = 'Irrigation Required';
      } else if (data.soil.moisture < 40) {
        statusElement.textContent = 'Monitor Closely';
      } else {
        statusElement.textContent = 'Optimal Level';
      }
    }
  }
  
  // Populate Fertilizer Section Details
  if (data.soil) {
    this.updateNutrientBar('nitrogen', data.soil.nitrogen);
    this.updateNutrientBar('phosphorus', data.soil.phosphorus);
    this.updateNutrientBar('potassium', data.soil.potassium);
  }
  
  // Populate Crop Health Section Details
  if (data.cropHealth) {
    this.updateElement('healthScoreValue', `${Math.round(data.cropHealth.score)}%`);
    this.updateElement('healthStatus', this.getHealthStatus(data.cropHealth.score));
    this.updateElement('growthStage', data.cropHealth.growthStage || 'Vegetative Growth');
    this.updateElement('daysFromPlanting', `${data.cropHealth.daysFromPlanting || 45} days`);
    this.updateElement('expectedHarvest', `${data.cropHealth.expectedHarvest || 75} days`);
    
    this.updateHealthFactors(data.cropHealth.factors);
  }
  
  // Populate Predictions Section Details
  if (data.yieldPrediction) {
    this.updateElement('yieldPredictionValue', `${data.yieldPrediction.perHectare} kg/ha`);
    this.updateElement('yieldConfidence', `${data.yieldPrediction.confidence}%`);
    
    const factorsContainer = document.getElementById('yieldFactors');
    if (factorsContainer) {
      factorsContainer.innerHTML = Object.entries(data.yieldPrediction.factors)
        .map(([key, value]) => `
          <div class="factor-item">
            <span>${key.charAt(0).toUpperCase() + key.slice(1)}:</span>
            <span>${value}%</span>
          </div>
        `).join('');
    }
  }
  
  // Populate Weather Impact
  this.updateWeatherImpactDetails(data);
  
  // Populate AI Recommendations
  this.updateAIRecommendationsDetails(data);
  
  // Populate Forecast
  if (data.forecast) {
    this.updateForecast(data.forecast);
  }
}

  updateFertilizerData(data) {
    if (!data.soil) return;

    // Update nutrient bars
    this.updateNutrientBar('nitrogen', data.soil.nitrogen);
    this.updateNutrientBar('phosphorus', data.soil.phosphorus);
    this.updateNutrientBar('potassium', data.soil.potassium);

    // Update recommendations
    const recommendations = this.generateFertilizerRecommendations(data.soil);
    this.updateRecommendations(recommendations, 'fertilizerRecommendations');
  }

  updateNutrientBar(nutrient, value) {
    const fill = document.getElementById(`${nutrient}Fill`);
    const valueElement = document.getElementById(`${nutrient}Value`);
    
    if (fill) {
      fill.style.width = `${Math.min(100, Math.max(0, value))}%`;
    }
    
    if (valueElement) {
      valueElement.textContent = `${Math.round(value)}%`;
    }
  }

  updateCropHealthData(data) {
    if (!data.cropHealth) return;

    // Update health score
    this.updateElement('healthScoreValue', `${Math.round(data.cropHealth.score)}%`);
    this.updateElement('healthStatus', this.getHealthStatus(data.cropHealth.score));

    // Update growth information
    this.updateElement('growthStage', data.cropHealth.growthStage || 'N/A');
    this.updateElement('daysFromPlanting', `${data.cropHealth.daysFromPlanting || 0} days`);
    this.updateElement('expectedHarvest', `${data.cropHealth.expectedHarvest || 0} days`);

    // Update health score chart
    if (this.chartsAvailable) {
      this.updateHealthScoreChart(data.cropHealth.score);
    }

    // Update health factors
    this.updateHealthFactors(data.cropHealth.factors);
  }

  updatePredictionsData(data) {
    if (!data.yieldPrediction) return;

    // Yield prediction
    this.updateElement('yieldPredictionValue', `${data.yieldPrediction.perHectare} kg/ha`);
    this.updateElement('yieldConfidence', `${data.yieldPrediction.confidence}%`);

    // Update yield factors
    const factorsContainer = document.getElementById('yieldFactors');
    if (factorsContainer) {
      factorsContainer.innerHTML = Object.entries(data.yieldPrediction.factors)
        .map(([key, value]) => `
          <div class="factor-item">
            <span>${key.charAt(0).toUpperCase() + key.slice(1)}:</span>
            <span>${value}%</span>
          </div>
        `).join('');
    }

    // Weather impact
    this.updateWeatherImpact(data);

    // AI recommendations
    this.updateAIRecommendations(data);
  }

  updateReportsData(data) {
    // Update report charts
    if (this.chartsAvailable) {
      this.updateReportCharts(data);
    }

    // Update metrics
    if (data.historical) {
      const avgMoisture = data.historical.soilMoisture.reduce((a, b) => a + b, 0) / 
        data.historical.soilMoisture.length;
      this.updateElement('avgMoisture', `${avgMoisture.toFixed(1)}%`);
    }
    
    this.updateElement('irrigationEfficiency', '87%');
    this.updateElement('nutrientBalance', 'Good');
  }

  // Chart Initialization
  initializeAllCharts() {
    if (!this.chartsAvailable) {
      console.log('⚠️ Charts not available, skipping chart initialization');
      return;
    }
    
    console.log('🎨 Initializing charts...');
    
    try {
      this.initializeSensorCharts();
      this.initializeWeatherCharts();
      this.initializeReportCharts();
      this.initializeHealthChart();
      console.log('✅ Charts initialized successfully');
    } catch (error) {
      console.error('❌ Chart initialization failed:', error);
      this.chartsAvailable = false;
      this.hideChartElements();
    }
  }

  initializeSensorCharts() {
    if (!this.chartsAvailable || typeof Chart === 'undefined') return;

    // Temperature Chart
    const tempCtx = document.getElementById('temperatureChart')?.getContext('2d');
    if (tempCtx) {
      this.charts.temperature = new Chart(tempCtx, {
        type: 'bar',
        data: {
          labels: ['Temperature'],
          datasets: [{
            label: 'Temperature (°C)',
            data: [25],
            backgroundColor: '#4CAF50',
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { min: 0, max: 50 } },
          plugins: { legend: { display: false } }
        }
      });
    }

    // Soil Moisture Chart
    const moistureCtx = document.getElementById('soilMoistureChart')?.getContext('2d');
    if (moistureCtx) {
      this.charts.soilMoisture = new Chart(moistureCtx, {
        type: 'doughnut',
        data: {
          labels: ['Moisture', 'Dry'],
          datasets: [{
            data: [40, 60],
            backgroundColor: ['#2a9d8f', '#e9ecef'],
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: { legend: { display: false } }
        }
      });
    }

    // Humidity Chart
    const humidityCtx = document.getElementById('humidityChart')?.getContext('2d');
    if (humidityCtx) {
      this.charts.humidity = new Chart(humidityCtx, {
        type: 'line',
        data: {
          labels: ['Now'],
          datasets: [{
            label: 'Humidity %',
            data: [60],
            fill: true,
            backgroundColor: 'rgba(42,157,143,0.1)',
            borderColor: '#2a9d8f',
            tension: 0.4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { min: 0, max: 100 } },
          plugins: { legend: { display: false } }
        }
      });
    }

    // pH Chart
    const phCtx = document.getElementById('phChart')?.getContext('2d');
    if (phCtx) {
      this.charts.ph = new Chart(phCtx, {
        type: 'bar',
        data: {
          labels: ['pH Level'],
          datasets: [{
            label: 'pH',
            data: [6.8],
            backgroundColor: '#e9c46a',
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { min: 4, max: 10 } },
          plugins: { legend: { display: false } }
        }
      });
    }

    // Historical Chart
    const historicalCtx = document.getElementById('historicalChart')?.getContext('2d');
    if (historicalCtx) {
      this.charts.historical = new Chart(historicalCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Temperature (°C)',
              data: [],
              borderColor: '#e76f51',
              backgroundColor: 'rgba(231,111,81,0.1)',
              yAxisID: 'y',
            },
            {
              label: 'Humidity (%)',
              data: [],
              borderColor: '#2a9d8f',
              backgroundColor: 'rgba(42,157,143,0.1)',
              yAxisID: 'y1',
            },
            {
              label: 'Soil Moisture (%)',
              data: [],
              borderColor: '#264653',
              backgroundColor: 'rgba(38,70,83,0.1)',
              yAxisID: 'y1',
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              min: 0,
              max: 50,
              title: { display: true, text: 'Temperature (°C)' }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              min: 0,
              max: 100,
              title: { display: true, text: 'Percentage (%)' },
              grid: {
                drawOnChartArea: false,
              },
            }
          }
        }
      });
    }
  }

  initializeWeatherCharts() {
    const weatherCtx = document.getElementById('weatherChart')?.getContext('2d');
    if (weatherCtx) {
      this.charts.weather = new Chart(weatherCtx, {
        data: {
          labels: [],
          datasets: [
            {
              type: 'bar',
              label: 'Rainfall (mm)',
              data: [],
              backgroundColor: 'rgba(54,162,235,0.6)',
              yAxisID: 'y1',
            },
            {
              type: 'line',
              label: 'Temperature (°C)',
              data: [],
              borderColor: '#e76f51',
              backgroundColor: 'rgba(231,111,81,0.1)',
              yAxisID: 'y',
              tension: 0.3,
              pointRadius: 4,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              type: 'linear',
              position: 'left',
              min: 10,
              max: 40,
              title: { display: true, text: 'Temperature (°C)' }
            },
            y1: {
              type: 'linear',
              position: 'right',
              min: 0,
              max: 20,
              grid: { drawOnChartArea: false },
              title: { display: true, text: 'Rainfall (mm)' }
            }
          }
        }
      });
    }
  }

  initializeReportCharts() {
    // Yield Chart
    const yieldCtx = document.getElementById('yieldChart')?.getContext('2d');
    if (yieldCtx) {
      this.charts.yield = new Chart(yieldCtx, {
        type: 'line',
        data: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
          datasets: [{
            label: 'Growth Progress (%)',
            data: [15, 28, 42, 56, 68, 75],
            borderColor: '#2a9d8f',
            backgroundColor: 'rgba(42,157,143,0.1)',
            tension: 0.3,
            pointRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { min: 0, max: 100 } }
        }
      });
    }

    // Cost Savings Chart
    const costCtx = document.getElementById('costSavingsChart')?.getContext('2d');
    if (costCtx) {
      this.charts.costSavings = new Chart(costCtx, {
        type: 'bar',
        data: {
          labels: ['Water', 'Fertilizer', 'Labor', 'Energy'],
          datasets: [{
            label: 'Savings (%)',
            data: [35, 28, 45, 22],
            backgroundColor: ['#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'],
            borderRadius: 6,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              min: 0,
              max: 50,
              title: { display: true, text: 'Savings %' }
            }
          }
        }
      });
    }

    // Water Usage Chart
    const waterCtx = document.getElementById('waterUsageChart')?.getContext('2d');
    if (waterCtx) {
      this.charts.waterUsage = new Chart(waterCtx, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Water Usage (L)',
            data: [1200, 1150, 1300, 1100, 1000, 950],
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33,150,243,0.1)',
            tension: 0.3,
            fill: true,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      });
    }
  }

  initializeHealthChart() {
    const healthCtx = document.getElementById('healthScoreChart')?.getContext('2d');
    if (healthCtx) {
      this.charts.healthScore = new Chart(healthCtx, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [70, 30],
            backgroundColor: ['#4CAF50', '#e9ecef'],
            borderWidth: 0,
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          cutout: '80%',
          plugins: { legend: { display: false } },
          animation: { duration: 1000 }
        }
      });
    }
  }

  // Chart Update Methods
  updateSensorCharts(data) {
    if (!this.chartsAvailable) return;

    // Temperature Chart
    if (this.charts.temperature) {
      this.charts.temperature.data.datasets[0].data = [data.weather.temperature];
      this.charts.temperature.data.datasets[0].backgroundColor = 
        this.getTemperatureColor(data.weather.temperature);
      this.charts.temperature.update('none');
    }

    // Soil Moisture Chart
    if (this.charts.soilMoisture) {
      const moisture = data.soil.moisture;
      this.charts.soilMoisture.data.datasets[0].data = [moisture, 100 - moisture];
      this.charts.soilMoisture.update('none');
    }

    // Humidity Chart
    if (this.charts.humidity && data.historical) {
      const maxPoints = 10;
      const humidity = data.historical.humidity.slice(-maxPoints);
      const timestamps = data.historical.timestamps.slice(-maxPoints)
        .map(t => new Date(t).toLocaleTimeString());
      
      this.charts.humidity.data.labels = timestamps;
      this.charts.humidity.data.datasets[0].data = humidity;
      this.charts.humidity.update('none');
    }

    // pH Chart
    if (this.charts.ph) {
      this.charts.ph.data.datasets[0].data = [data.soil.ph];
      this.charts.ph.update('none');
    }

    // Historical Chart
    if (this.charts.historical && data.historical) {
      const maxPoints = 15;
      const timestamps = data.historical.timestamps.slice(-maxPoints)
        .map(t => new Date(t).toLocaleTimeString());
      
      this.charts.historical.data.labels = timestamps;
      this.charts.historical.data.datasets[0].data = data.historical.temperature.slice(-maxPoints);
      this.charts.historical.data.datasets[1].data = data.historical.humidity.slice(-maxPoints);
      this.charts.historical.data.datasets[2].data = data.historical.soilMoisture.slice(-maxPoints);
      this.charts.historical.update('none');
    }
  }

  updateHealthScoreChart(score) {
    if (!this.charts.healthScore) return;

    this.charts.healthScore.data.datasets[0].data = [score, 100 - score];
    this.charts.healthScore.data.datasets[0].backgroundColor = [
      this.getHealthColor(score),
      '#e9ecef'
    ];
    this.charts.healthScore.update('none');
  }

  updateReportCharts(data) {
    // Update yield chart with progressive data
    if (this.charts.yield) {
      const weeklyProgress = [15, 28, 42, 56, 68, 75];
      this.charts.yield.data.datasets[0].data = weeklyProgress;
      this.charts.yield.update('none');
    }

    // Update water usage chart
    if (this.charts.waterUsage && data.historical) {
      const monthlyUsage = [1200, 1150, 1300, 1100, 1000, 950];
      this.charts.waterUsage.data.datasets[0].data = monthlyUsage;
      this.charts.waterUsage.update('none');
    }

    // Update weather chart
    if (this.charts.weather && data.forecast) {
      const labels = data.forecast.map(day => day.date);
      const temperatures = data.forecast.map(day => day.temperature.avg);
      const rainfall = data.forecast.map(day => day.rainfall);

      this.charts.weather.data.labels = labels;
      this.charts.weather.data.datasets[0].data = rainfall;
      this.charts.weather.data.datasets[1].data = temperatures;
      this.charts.weather.update('none');
    }
  }

  // Event Listeners
  setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Navigation
    this.setupNavigation();

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        console.log('🔄 Refresh clicked');
        this.refreshData();
      });
    }

    // Action buttons
    const quickIrrigateBtn = document.getElementById('quickIrrigateBtn');
    if (quickIrrigateBtn) {
      quickIrrigateBtn.addEventListener('click', () => {
        this.showNotification('💧 Irrigation system activated!', 'success');
        console.log('Irrigation activated');
      });
    }

    const viewAlertsBtn = document.getElementById('viewAlertsBtn');
    if (viewAlertsBtn) {
      viewAlertsBtn.addEventListener('click', () => {
        console.log('View alerts clicked');
        document.querySelector('[data-target="dashboard"]').click();
      });
    }

    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) {
      exportDataBtn.addEventListener('click', () => {
        this.exportData();
      });
    }

    // Footer buttons
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        alert('Help: Use navigation to switch sections. Click refresh to update data.');
      });
    }

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        alert('Settings: Configure API keys and preferences (Feature coming soon)');
      });
    }

    const aboutBtn = document.getElementById('aboutBtn');
    if (aboutBtn) {
      aboutBtn.addEventListener('click', () => {
        alert('Smart Farming Dashboard v1.0 - Complete agricultural monitoring solution');
      });
    }

    console.log('✅ Event listeners set up complete');
  }

  setupNavigation() {
    console.log('🧭 Setting up navigation...');
    
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.panel');

    console.log('Found nav buttons:', navButtons.length);
    console.log('Found panels:', sections.length);

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        console.log('🔘 Navigation clicked:', target);
        
        // Update active button
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Show target section
        sections.forEach(section => {
          if (section.id === target) {
            section.classList.remove('hidden');
            console.log('📺 Showing section:', target);
          } else {
            section.classList.add('hidden');
          }
        });

        // Handle special section initialization
        this.handleSectionChange(target);
      });
    });
    
    console.log('✅ Navigation setup complete');
  }

  handleSectionChange(sectionId) {
    console.log('🔄 Section changed to:', sectionId);
    
    // Initialize specific sections with current data
    if (this.data.current) {
      switch (sectionId) {
        case 'sensors':
          this.updateSensorData(this.data.current);
          break;
        case 'weather':
          this.updateWeatherData(this.data.current);
          break;
        case 'irrigation':
          this.updateIrrigationData(this.data.current);
          break;
        case 'fertilizer':
          this.updateFertilizerData(this.data.current);
          break;
        case 'crop-health':
          this.updateCropHealthData(this.data.current);
          break;
        case 'reports':
          this.updateReportsData(this.data.current);
          break;
        case 'predictions':
          this.updatePredictionsData(this.data.current);
          break;
      }
    }
  }

  // Utility Methods
  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  updateTrend(elementId, currentValue, referenceValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const diff = currentValue - referenceValue;
    
    if (Math.abs(diff) < referenceValue * 0.05) {
      element.textContent = 'Stable';
      element.className = 'sensor-trend stable';
    } else if (diff > 0) {
      element.textContent = `+${diff.toFixed(1)}`;
      element.className = 'sensor-trend up';
    } else {
      element.textContent = `${diff.toFixed(1)}`;
      element.className = 'sensor-trend down';
    }
  }

  getTemperatureColor(temp) {
    if (temp < 15) return '#2196F3';
    if (temp > 30) return '#f44336';
    return '#4CAF50';
  }

  getHealthColor(score) {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    if (score >= 40) return '#f44336';
    return '#9C27B0';
  }

  getTemperatureStatus(temp) {
    if (temp < 15) return 'Too Cold';
    if (temp > 30) return 'Too Hot';
    return 'Optimal';
  }

  getMoistureStatus(moisture) {
    if (moisture < 20) return 'Critical';
    if (moisture < 30) return 'Low';
    if (moisture > 70) return 'High';
    return 'Good';
  }

  getHealthStatus(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  }

  getWeatherIcon(description) {
    const icons = {
      'clear sky': '☀️',
      'few clouds': '🌤️',
      'scattered clouds': '⛅',
      'broken clouds': '☁️',
      'overcast clouds': '☁️',
      'light rain': '🌦️',
      'moderate rain': '🌧️',
      'heavy rain': '⛈️',
      'thunderstorm': '⛈️',
      'snow': '❄️',
      'mist': '🌫️',
      'partly cloudy': '⛅'
    };
    return icons[description] || '🌤️';
  }

  updateDateTime() {
    const element = document.getElementById('currentDateTime');
    if (element) {
      element.textContent = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    }
  }

  // Recommendation Methods
  updateRecommendations(recommendations, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!recommendations || recommendations.length === 0) {
      container.innerHTML = '<p class="no-recommendations">No recommendations at this time ✅</p>';
      return;
    }

    container.innerHTML = recommendations.map(rec => `
      <div class="recommendation-card priority-${rec.priority.toLowerCase()}">
        <div class="rec-type">${rec.type.toUpperCase()}</div>
        <div class="rec-message">${rec.message}</div>
        <div class="rec-action">${rec.action}</div>
      </div>
    `).join('');
  }

  generateFertilizerRecommendations(soil) {
    const recommendations = [];

    if (soil.nitrogen < 40) {
      recommendations.push({
        type: 'fertilizer',
        priority: 'HIGH',
        message: `Nitrogen level low at ${Math.round(soil.nitrogen)}%`,
        action: 'Apply urea (46-0-0) at 120kg/ha within 3 days'
      });
    }

    if (soil.phosphorus < 30) {
      recommendations.push({
        type: 'fertilizer',
        priority: 'MEDIUM',
        message: `Phosphorus below optimal at ${Math.round(soil.phosphorus)}%`,
        action: 'Apply DAP (18-46-0) at 100kg/ha'
      });
    }

    if (soil.potassium < 40) {
      recommendations.push({
        type: 'fertilizer',
        priority: 'MEDIUM',
        message: `Potassium deficiency at ${Math.round(soil.potassium)}%`,
        action: 'Apply MOP (0-0-60) at 80kg/ha'
      });
    }

    return recommendations;
  }

  updateAlerts(data) {
    const container = document.getElementById('alertsContainer');
    if (!container) return;

    const alerts = this.generateAlerts(data);
    
    if (alerts.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = alerts.map(alert => `
      <div class="alert-card ${alert.type}">
        <div>
          <strong>${alert.title}</strong>
          <p>${alert.message}</p>
        </div>
        <span class="alert-close" onclick="this.parentElement.remove()">&times;</span>
      </div>
    `).join('');
  }

  generateAlerts(data) {
    const alerts = [];

    if (data.soil?.moisture < 20) {
      alerts.push({
        type: 'critical',
        title: 'Critical Soil Moisture',
        message: `Soil moisture at ${data.soil.moisture.toFixed(1)}%. Immediate irrigation required.`
      });
    }

    if (data.weather?.temperature > 35) {
      alerts.push({
        type: 'critical',
        title: 'High Temperature Alert',
        message: `Temperature at ${Math.round(data.weather.temperature)}°C. Risk of heat stress.`
      });
    }

    if (data.cropHealth?.score < 50) {
      alerts.push({
        type: 'critical',
        title: 'Poor Crop Health',
        message: `Health score at ${Math.round(data.cropHealth.score)}%. Immediate attention required.`
      });
    }

    return alerts;
  }

  updateHealthFactors(factors) {
    const container = document.getElementById('healthFactors');
    if (!container || !factors) return;

    container.innerHTML = Object.entries(factors).map(([key, factor]) => {
      let statusClass = 'optimal';
      if (factor.status === 'critical') statusClass = 'critical';
      else if (factor.status === 'suboptimal' || factor.status === 'moderate') statusClass = 'warning';

      return `
        <div class="factor-card ${statusClass}">
          <h4>${key.charAt(0).toUpperCase() + key.slice(1)}</h4>
          <div class="factor-value">${factor.value}${this.getFactorUnit(key)}</div>
          <div class="factor-status">${factor.status}</div>
        </div>
      `;
    }).join('');
  }

  getFactorUnit(factor) {
    const units = {
      temperature: '°C',
      soilMoisture: '%',
      ph: '',
      humidity: '%'
    };
    return units[factor] || '';
  }

  updateWeatherImpact(data) {
    const container = document.getElementById('weatherImpact');
    if (!container) return;

    const impact = this.calculateWeatherImpact(data);
    container.innerHTML = `
      <div class="impact-summary">
        <h4>Overall Impact: ${impact.overall}</h4>
        <p>${impact.description}</p>
      </div>
      <div class="impact-factors">
        ${impact.factors.map(factor => `
          <div class="impact-factor">
            <span class="factor-name">${factor.name}:</span>
            <span class="factor-impact ${factor.impact.toLowerCase()}">${factor.impact}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  calculateWeatherImpact(data) {
    const factors = [];
    let overallScore = 0;

    // Temperature impact
    if (data.weather.temperature >= 20 && data.weather.temperature <= 28) {
      factors.push({ name: 'Temperature', impact: 'Positive' });
      overallScore += 20;
    } else {
      factors.push({ name: 'Temperature', impact: 'Negative' });
      overallScore -= 10;
    }

    // Humidity impact
    if (data.weather.humidity >= 50 && data.weather.humidity <= 70) {
      factors.push({ name: 'Humidity', impact: 'Positive' });
      overallScore += 15;
    } else {
      factors.push({ name: 'Humidity', impact: 'Neutral' });
    }

    // Rainfall prediction from forecast
    if (data.forecast && data.forecast.length > 0) {
      const rainExpected = data.forecast.slice(0, 3).some(day => day.rainfall > 2);
      factors.push({ 
        name: 'Rainfall', 
        impact: rainExpected ? 'Positive' : 'Neutral' 
      });
      if (rainExpected) overallScore += 15;
    }

    let overall = 'Neutral';
    if (overallScore > 30) overall = 'Positive';
    else if (overallScore < 0) overall = 'Negative';

    return {
      overall,
      description: this.getWeatherImpactDescription(overall),
      factors
    };
  }

  getWeatherImpactDescription(impact) {
    const descriptions = {
      'Positive': 'Weather conditions are favorable for crop growth and development.',
      'Neutral': 'Weather conditions are moderate. Monitor for changes.',
      'Negative': 'Weather conditions may stress crops. Take protective measures.'
    };
    return descriptions[impact];
  }
updateWeatherImpactDetails(data) {
  const weatherImpact = document.getElementById('weatherImpact');
  if (!weatherImpact || !data.weather) return;
  
  const tempImpact = data.weather.temperature >= 20 && data.weather.temperature <= 28 ? 'Positive' : 'Negative';
  const humidityImpact = data.weather.humidity >= 50 && data.weather.humidity <= 70 ? 'Positive' : 'Neutral';
  const overallImpact = tempImpact === 'Positive' && humidityImpact === 'Positive' ? 'Positive' : 'Moderate';
  
  weatherImpact.innerHTML = `
    <div class="impact-summary">
      <h4>Overall Impact: ${overallImpact}</h4>
      <p>Current weather conditions in ${data.location?.city || 'your area'} are ${data.weather.temperature > 30 ? 'challenging due to high temperatures' : 'favorable for crop growth'}.</p>
    </div>
    <div class="impact-factors">
      <div class="impact-factor">
        <span class="factor-name">Temperature (${Math.round(data.weather.temperature)}°C):</span>
        <span class="factor-impact ${tempImpact.toLowerCase()}">${tempImpact}</span>
      </div>
      <div class="impact-factor">
        <span class="factor-name">Humidity (${data.weather.humidity}%):</span>
        <span class="factor-impact ${humidityImpact.toLowerCase()}">${humidityImpact}</span>
      </div>
      <div class="impact-factor">
        <span class="factor-name">Soil Moisture:</span>
        <span class="factor-impact positive">Good</span>
      </div>
    </div>
  `;
}

updateAIRecommendationsDetails(data) {
  const aiRecommendations = document.getElementById('aiRecommendations');
  if (!aiRecommendations) return;
  
  let recommendations = [];
  
  // Smart recommendations based on real data
  if (data.weather?.temperature > 30) {
    recommendations.push({
      icon: '🌡️',
      title: 'Heat Stress Management',
      description: `Temperature at ${Math.round(data.weather.temperature)}°C is high. Consider shade nets or increased irrigation frequency during peak hours.`,
      priority: 'High'
    });
  }
  
  if (data.cropHealth?.score > 80) {
    recommendations.push({
      icon: '🤖',
      title: 'Maintain Excellence',
      description: `Crop health is excellent at ${Math.round(data.cropHealth.score)}%. Continue current management practices for optimal yield.`,
      priority: 'Low'
    });
  }
  
  if (data.soil?.moisture < 40) {
    recommendations.push({
      icon: '💧',
      title: 'Smart Irrigation',
      description: `Soil moisture at ${data.soil.moisture.toFixed(1)}%. Monitor closely and irrigate within 24-48 hours if no rainfall expected.`,
      priority: 'Medium'
    });
  }
  
  if (data.yieldPrediction) {
    recommendations.push({
      icon: '📈',
      title: 'Yield Optimization',
      description: `Based on current conditions, predicted yield is ${data.yieldPrediction.perHectare} kg/ha with ${data.yieldPrediction.confidence}% confidence.`,
      priority: 'Low'
    });
  }
  
  // Always add at least one recommendation
  if (recommendations.length === 0) {
    recommendations.push({
      icon: '✅',
      title: 'System Optimal',
      description: 'All parameters are within normal ranges. Continue monitoring for best results.',
      priority: 'Low'
    });
  }
  
  aiRecommendations.innerHTML = recommendations.map(rec => `
    <div class="ai-recommendation">
      <div class="ai-rec-header">
        <span class="ai-rec-icon">${rec.icon}</span>
        <strong>${rec.title}</strong>
      </div>
      <p>${rec.description}</p>
      <div class="ai-rec-priority">Priority: ${rec.priority}</div>
    </div>
  `).join('');
}

  updateAIRecommendations(data) {
    const container = document.getElementById('aiRecommendations');
    if (!container) return;

    const recommendations = this.generateAIRecommendations(data);
    container.innerHTML = recommendations.map(rec => `
      <div class="ai-recommendation">
        <div class="ai-rec-header">
          <span class="ai-rec-icon">${rec.icon}</span>
          <strong>${rec.title}</strong>
        </div>
        <p>${rec.description}</p>
        <div class="ai-rec-priority">Priority: ${rec.priority}</div>
      </div>
    `).join('');
  }

  generateAIRecommendations(data) {
    const recommendations = [];

    // AI-based recommendations using current data
    if (data.cropHealth.score < 70) {
      recommendations.push({
        icon: '🤖',
        title: 'Optimize Growing Conditions',
        description: 'AI analysis suggests adjusting irrigation schedule and nutrient balance to improve crop health by 15-20%.',
        priority: 'High'
      });
    }

    if (data.soil.moisture < 35 && data.forecast?.some(day => day.rainfall > 5)) {
      recommendations.push({
        icon: '💧',
        title: 'Smart Irrigation Timing',
        description: 'Delay irrigation by 24-48 hours due to predicted rainfall. This can save 200-300L of water per hectare.',
        priority: 'Medium'
      });
    }

    if (data.yieldPrediction.confidence > 80) {
      recommendations.push({
        icon: '📈',
        title: 'Yield Optimization',
        description: 'Current conditions are optimal. Maintain existing practices to achieve predicted yield targets.',
        priority: 'Low'
      });
    }

    return recommendations;
  }

  exportData() {
    if (!this.data.current) {
      this.showNotification('No data to export', 'warning');
      return;
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      weather: this.data.current.weather,
      soil: this.data.current.soil,
      cropHealth: this.data.current.cropHealth,
      yieldPrediction: this.data.current.yieldPrediction,
      forecast: this.data.current.forecast,
      historical: this.data.current.historical
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `farm-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showNotification('📥 Data exported successfully', 'success');
    console.log('Data exported:', exportData);
  }

  refreshData() {
    this.showNotification('Refreshing data...', 'info', 2000);
    
    if (this.socket && this.socket.connected) {
      this.socket.emit('requestUpdate');
      console.log('📡 Requested real-time update from server');
    } else if (this.isServerMode) {
      this.fetchInitialData();
    } else {
      this.loadDemoData();
    }
  }

  loadSettings() {
    const saved = localStorage.getItem('farmingDashboardSettings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
  }

  saveSettings() {
    localStorage.setItem('farmingDashboardSettings', JSON.stringify(this.settings));
  }

  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${this.getNotificationIcon(type)}</span>
        <span class="notification-message">${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }

  getNotificationIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  }
}

// Global Functions
window.quickIrrigate = function() {
  if (window.dashboard) {
    dashboard.showNotification('💧 Irrigation system activated!', 'success');
  } else {
    alert('Irrigation activated!');
  }
};

window.viewAlerts = function() {
  document.querySelector('[data-target="dashboard"]')?.click();
};

window.exportData = function() {
  if (window.dashboard) {
    window.dashboard.exportData();
  } else {
    alert('Data export feature - would export current dashboard data as JSON/CSV');
  }
};

// Initialize Dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    console.log('🚀 Initializing Smart Farming Dashboard...');
    window.dashboard = new SmartFarmingDashboard();
  }, 500);
});
