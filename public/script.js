// Smart Farming Dashboard - Complete Final Version with All Issues Fixed
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
    this.chartsAvailable = false;
    this.socketAvailable = window.IO_AVAILABLE || false;
    this.chartsInitialized = false;
    
    // FIXED SUBSCRIPTION FEATURES - PROPER ACCESS CONTROL
    this.currentPlan = 'free'; // 'free', 'pro', 'premium'
    this.planFeatures = {
      // FREE: Basic features only
      free: ['dashboard-basic', 'sensors-basic', 'weather', 'irrigation-basic', 'fertilizer-basic'],
      // PRO: Adds crop health but NOT predicted yield
      pro: ['dashboard-basic', 'dashboard-health', 'sensors-basic', 'sensors-advanced', 'weather', 'irrigation-basic', 'fertilizer-basic', 'crop-health', 'export-csv'],
      // PREMIUM: Everything including predicted yield and reports
      premium: ['dashboard-basic', 'dashboard-health', 'dashboard-yield', 'sensors-basic', 'sensors-advanced', 'weather', 'irrigation-basic', 'fertilizer-basic', 'crop-health', 'reports', 'predictions', 'export-all', 'multi-farm', 'api-access']
    };
    
    console.log('🔌 Socket.IO available:', this.socketAvailable);
    console.log('💎 Current subscription plan:', this.currentPlan);
    console.log('🔐 Plan features:', this.planFeatures[this.currentPlan]);
    
    this.init();
  }

  async init() {
    try {
      console.log('🚀 Initializing Smart Farming Dashboard...');
      
      this.showLoading(false);
      this.updateSubscriptionBadge();
      this.checkRunningMode();
      
      if (this.isServerMode && this.socketAvailable) {
        await this.initializeSocket();
      }
      
      this.setupEventListeners();
      this.loadSettings();
      this.updateDateTime();
      setInterval(() => this.updateDateTime(), 60000);
      
      // FIXED: Always load demo data first, then try API
      await this.fetchInitialData();
      this.waitForChartJS();
      
      // FIXED: Always update feature access after data is loaded
      this.updateFeatureAccess();
      
      console.log('✅ Smart Farming Dashboard initialized successfully');
    } catch (error) {
      console.error('Initialization error:', error);
      this.loadCompleteDemoData();
      this.updateFeatureAccess();
    }
  }

  // CHART.JS DETECTION AND INITIALIZATION
  waitForChartJS() {
    const maxAttempts = 20;
    let attempts = 0;
    
    const checkChart = () => {
      attempts++;
      
      if (typeof Chart !== 'undefined') {
        console.log('📊 Chart.js detected, initializing charts...');
        this.chartsAvailable = true;
        this.removeChartPlaceholders();
        this.initializeAllCharts();
      } else if (attempts < maxAttempts) {
        setTimeout(checkChart, 500);
      } else {
        console.log('📊 Chart.js not loaded after 10 seconds, showing placeholders');
        this.hideChartElements();
      }
    };
    
    checkChart();
  }

  removeChartPlaceholders() {
    const placeholders = document.querySelectorAll('.chart-text-alternative');
    placeholders.forEach(placeholder => {
      if (placeholder.parentElement) {
        placeholder.remove();
      }
    });
    
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      canvas.style.display = 'block';
    });
    
    console.log('✅ Chart placeholders removed');
  }

  hideChartElements() {
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
      const canvas = container.querySelector('canvas');
      if (canvas) {
        canvas.style.display = 'none';
        
        if (!container.querySelector('.chart-text-alternative')) {
          const textDiv = document.createElement('div');
          textDiv.className = 'chart-text-alternative';
          textDiv.innerHTML = '<p>📊 Chart data will be displayed here when Chart.js loads</p>';
          container.appendChild(textDiv);
        }
      }
    });
  }

  // COMPLETE CHART INITIALIZATION
  initializeAllCharts() {
    if (this.chartsInitialized) {
      console.log('📊 Charts already initialized, skipping...');
      return;
    }

    if (typeof Chart === 'undefined') {
      console.log('Charts not available - Chart.js not loaded');
      return;
    }
    
    console.log('📊 Initializing all charts with proper access control...');
    
    try {
      Object.values(this.charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
          chart.destroy();
        }
      });
      this.charts = {};

      const createChart = (canvasId, config) => {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
          try {
            canvas.style.display = 'block';
            this.charts[canvasId] = new Chart(canvas.getContext('2d'), config);
            console.log(`✅ Created chart: ${canvasId}`);
          } catch (error) {
            console.error(`❌ Error creating ${canvasId}:`, error);
          }
        }
      };

      // Basic Charts - Always Available
      createChart('temperatureChart', {
        type: 'line',
        data: {
          labels: ['6h ago', '5h ago', '4h ago', '3h ago', '2h ago', '1h ago', 'Now'],
          datasets: [{
            label: 'Temperature (°C)',
            data: [28, 29, 30, 31, 31.5, 31.2, 31.1],
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231,76,60,0.1)',
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: false, grid: { display: true } },
            x: { grid: { display: false } }
          }
        }
      });

      createChart('soilMoistureChart', {
        type: 'line',
        data: {
          labels: ['6h ago', '5h ago', '4h ago', '3h ago', '2h ago', '1h ago', 'Now'],
          datasets: [{
            label: 'Soil Moisture (%)',
            data: [35, 34, 33.5, 33.8, 33.2, 33.0, 33.2],
            borderColor: '#3498db',
            backgroundColor: 'rgba(52,152,219,0.1)',
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: false, grid: { display: true } },
            x: { grid: { display: false } }
          }
        }
      });

      createChart('weatherChart', {
        type: 'bar',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Temperature (°C)',
            data: [32, 29, 28, 26, 30, 31, 33],
            backgroundColor: '#f39c12'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: false, grid: { display: true } },
            x: { grid: { display: false } }
          }
        }
      });

      // PRO+ Charts
      if (this.hasAccess('sensors-advanced')) {
        createChart('humidityChart', {
          type: 'line',
          data: {
            labels: ['6h ago', '5h ago', '4h ago', '3h ago', '2h ago', '1h ago', 'Now'],
            datasets: [{
              label: 'Humidity (%)',
              data: [60, 62, 64, 66, 65, 64, 65],
              borderColor: '#9b59b6',
              backgroundColor: 'rgba(155,89,182,0.1)',
              tension: 0.3,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: false, grid: { display: true } },
              x: { grid: { display: false } }
            }
          }
        });

        createChart('phChart', {
          type: 'line',
          data: {
            labels: ['6h ago', '5h ago', '4h ago', '3h ago', '2h ago', '1h ago', 'Now'],
            datasets: [{
              label: 'pH Level',
              data: [6.7, 6.8, 6.8, 6.9, 6.8, 6.8, 6.8],
              borderColor: '#f39c12',
              backgroundColor: 'rgba(243,156,18,0.1)',
              tension: 0.3,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { min: 6.0, max: 7.5, grid: { display: true } },
              x: { grid: { display: false } }
            }
          }
        });
      }

      // Crop Health Chart - PRO+ only
      if (this.hasAccess('crop-health')) {
        createChart('healthScoreChart', {
          type: 'doughnut',
          data: {
            datasets: [{
              data: [88, 12],
              backgroundColor: ['#2ecc71', '#ecf0f1'],
              borderWidth: 0,
              cutout: '70%'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1,
            plugins: { legend: { display: false } }
          }
        });
      }

      // Premium Charts - Reports section
      if (this.hasAccess('reports')) {
        createChart('historicalChart', {
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [
              {
                label: 'Temperature (°C)',
                data: [22, 24, 27, 29, 31, 33],
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231,76,60,0.1)'
              },
              {
                label: 'Humidity (%)',
                data: [75, 70, 68, 65, 62, 60],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52,152,219,0.1)'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { boxWidth: 12, font: { size: 11 } }
              }
            },
            scales: {
              y: { beginAtZero: false, grid: { display: true } },
              x: { grid: { display: false } }
            }
          }
        });

        createChart('yieldChart', {
          type: 'line',
          data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
            datasets: [{
              label: 'Growth Progress (%)',
              data: [15, 28, 42, 56, 68, 75],
              borderColor: '#2a9d8f',
              backgroundColor: 'rgba(42,157,143,0.1)',
              tension: 0.3,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { min: 0, max: 100, grid: { display: true } },
              x: { grid: { display: false } }
            }
          }
        });

        createChart('costSavingsChart', {
          type: 'doughnut',
          data: {
            labels: ['Water', 'Fertilizer', 'Labor', 'Energy'],
            datasets: [{
              data: [35, 28, 45, 22],
              backgroundColor: ['#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'],
              borderWidth: 0,
              cutout: '60%'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { boxWidth: 12, font: { size: 11 } }
              }
            }
          }
        });

        createChart('waterUsageChart', {
          type: 'bar',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
              label: 'Water Usage (L)',
              data: [1200, 1150, 1300, 1100, 1000, 950],
              backgroundColor: '#2196F3',
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, grid: { display: true } },
              x: { grid: { display: false } }
            }
          }
        });
      }

      this.chartsInitialized = true;
      console.log('✅ All charts initialized successfully');
      console.log('📊 Total charts created:', Object.keys(this.charts).length);
      
    } catch (error) {
      console.error('Chart initialization error:', error);
    }
  }

  // SUBSCRIPTION MANAGEMENT METHODS
  updateSubscriptionBadge() {
    const badge = document.getElementById('subscriptionBadge');
    if (!badge) return;
    
    switch(this.currentPlan) {
      case 'free':
        badge.textContent = 'FREE PLAN';
        badge.className = 'subscription-badge free';
        break;
      case 'pro':
        badge.textContent = 'PRO PLAN';
        badge.className = 'subscription-badge pro';
        break;
      case 'premium':
        badge.textContent = 'PREMIUM PLAN';
        badge.className = 'subscription-badge premium';
        break;
    }
  }

  hasAccess(feature) {
    return this.planFeatures[this.currentPlan].includes(feature);
  }

  updateFeatureAccess() {
    console.log('🔄 Updating feature access for plan:', this.currentPlan);
    console.log('🔐 Available features:', this.planFeatures[this.currentPlan]);
    
    // Update plan cards
    document.querySelectorAll('.pricing-card').forEach(card => {
      card.classList.remove('current');
      const button = card.querySelector('.plan-btn');
      if (button) {
        button.disabled = false;
        button.textContent = card.id === 'freePlanCard' ? 'Downgrade to Free' : 
                           card.id === 'proPlanCard' ? 'Upgrade to Pro' : 'Upgrade to Premium';
      }
    });

    const currentCard = document.getElementById(`${this.currentPlan}PlanCard`);
    if (currentCard) {
      currentCard.classList.add('current');
      const button = currentCard.querySelector('.plan-btn');
      if (button) {
        button.disabled = true;
        button.textContent = 'Current Plan';
      }
    }

    // Handle premium sections
    this.updatePremiumSection('crop-health', 'crop-health');
    this.updatePremiumSection('reports', 'reports');
    this.updatePremiumSection('predictions', 'predictions');

    // FIXED: Update overview cards access with current data
    if (this.data.current) {
      this.updateOverviewCardAccess();
    }

    // Show/hide premium overlays
    document.querySelectorAll('.premium-feature').forEach(feature => {
      const overlay = feature.querySelector('.premium-overlay');
      if (overlay) {
        if (feature.classList.contains('sensors-advanced') && !this.hasAccess('sensors-advanced')) {
          overlay.style.display = 'flex';
        } else if (feature.classList.contains('dashboard-health') && !this.hasAccess('dashboard-health')) {
          overlay.style.display = 'flex';
        } else if (feature.classList.contains('dashboard-yield') && !this.hasAccess('dashboard-yield')) {
          overlay.style.display = 'flex';
        } else {
          overlay.style.display = 'none';
        }
      }
    });

    // Update navigation buttons
    document.querySelectorAll('.nav-btn.premium-required').forEach(btn => {
      const target = btn.getAttribute('data-target');
      if (target === 'crop-health' && !this.hasAccess('crop-health')) {
        btn.style.opacity = '0.6';
        btn.style.pointerEvents = 'none';
      } else if ((target === 'reports' || target === 'predictions') && !this.hasAccess('reports')) {
        btn.style.opacity = '0.6';
        btn.style.pointerEvents = 'none';
      } else {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      }
    });
    
    console.log('✅ Feature access updated');
  }

  // FIXED: Update Overview Card Access Based on Plan and Data
  updateOverviewCardAccess() {
    const data = this.data.current;
    if (!data) return;

    // Handle Crop Health overview card
    const healthCard = document.getElementById('overviewHealth')?.closest('.overview-card');
    const healthValue = document.getElementById('overviewHealth');
    const healthStatus = document.getElementById('overviewHealthStatus');
    
    if (this.hasAccess('dashboard-health') && data.cropHealth) {
      // PRO+ users: Show actual data
      if (healthValue) healthValue.textContent = Math.round(data.cropHealth.score) + '%';
      if (healthStatus) {
        healthStatus.textContent = data.cropHealth.score > 80 ? 'Excellent' : data.cropHealth.score > 60 ? 'Good' : 'Fair';
      }
      if (healthCard) {
        healthCard.style.opacity = '1';
        healthCard.style.cursor = 'default';
        healthCard.onclick = null;
        this.removeLockIcon(healthCard);
      }
      console.log('✅ Crop Health data shown for', this.currentPlan);
    } else {
      // FREE users: Show locked state
      if (healthValue) healthValue.textContent = '--';
      if (healthStatus) healthStatus.textContent = 'Upgrade to Pro';
      if (healthCard) {
        healthCard.style.opacity = '0.6';
        healthCard.style.cursor = 'pointer';
        healthCard.onclick = () => this.showUpgradeModal('pro');
        this.addLockIcon(healthCard);
      }
      console.log('🔒 Crop Health locked for', this.currentPlan);
    }

    // Handle Predicted Yield overview card
    const yieldCard = document.getElementById('overviewYield')?.closest('.overview-card');
    const yieldValue = document.getElementById('overviewYield');
    const yieldStatus = document.getElementById('overviewYieldStatus');
    
    if (this.hasAccess('dashboard-yield') && data.yieldPrediction) {
      // PREMIUM users: Show actual data
      if (yieldValue) yieldValue.textContent = data.yieldPrediction.perHectare + ' kg/ha';
      if (yieldStatus) yieldStatus.textContent = data.yieldPrediction.confidence + '% confidence';
      if (yieldCard) {
        yieldCard.style.opacity = '1';
        yieldCard.style.cursor = 'default';
        yieldCard.onclick = null;
        this.removeLockIcon(yieldCard);
      }
      console.log('✅ Predicted Yield data shown for', this.currentPlan);
    } else {
      // FREE/PRO users: Show locked state
      if (yieldValue) yieldValue.textContent = '--';
      if (yieldStatus) yieldStatus.textContent = 'Upgrade to Premium';
      if (yieldCard) {
        yieldCard.style.opacity = '0.6';
        yieldCard.style.cursor = 'pointer';
        yieldCard.onclick = () => this.showUpgradeModal('premium');
        this.addLockIcon(yieldCard);
      }
      console.log('🔒 Predicted Yield locked for', this.currentPlan);
    }
  }

  addLockIcon(card) {
    if (!card.querySelector('.lock-icon')) {
      const lock = document.createElement('div');
      lock.className = 'lock-icon';
      lock.innerHTML = '🔒';
      lock.style.cssText = 'position: absolute; top: 10px; right: 10px; font-size: 16px; opacity: 0.7; z-index: 10;';
      card.style.position = 'relative';
      card.appendChild(lock);
    }
  }

  removeLockIcon(card) {
    const lock = card.querySelector('.lock-icon');
    if (lock) {
      lock.remove();
    }
  }

  updatePremiumSection(sectionId, featureKey) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    const overlay = section.querySelector('.premium-section-overlay');
    const content = section.querySelector('.crop-health-content, .reports-content, .predictions-content');
    
    if (this.hasAccess(featureKey)) {
      console.log(`✅ Granting access to ${sectionId}`);
      if (overlay) overlay.style.display = 'none';
      if (content) {
        content.style.display = 'block';
      } else {
        this.createBasicContent(section, sectionId);
      }
      section.classList.remove('premium-section');
    } else {
      console.log(`❌ Denying access to ${sectionId}`);
      if (overlay) overlay.style.display = 'flex';
      if (content) content.style.display = 'none';
      section.classList.add('premium-section');
    }
  }

  createBasicContent(section, sectionId) {
    let contentHTML = '';
    
    if (sectionId === 'crop-health') {
      contentHTML = `
        <div class="crop-health-content" style="display: block;">
          <div class="health-overview">
            <div class="health-score-card">
              <h3>🌿 Overall Health Score</h3>
              <div class="health-score-display">
                <div class="health-score-value" id="healthScoreValue">88%</div>
                <div class="health-status" id="healthStatus">Excellent</div>
              </div>
            </div>
            
            <div class="growth-info">
              <div class="growth-metrics">
                <div class="growth-metric">
                  <span class="metric-label">Growth Stage:</span>
                  <strong class="metric-value" id="growthStage">Vegetative Growth</strong>
                </div>
                <div class="growth-metric">
                  <span class="metric-label">Days from Planting:</span>
                  <strong class="metric-value" id="daysFromPlanting">45 days</strong>
                </div>
                <div class="growth-metric">
                  <span class="metric-label">Expected Harvest:</span>
                  <strong class="metric-value" id="expectedHarvest">75 days</strong>
                </div>
              </div>
            </div>
          </div>
          
          <div class="health-factors-section">
            <h3>🌱 Environmental Factors</h3>
            <div class="factors-grid" id="healthFactors">
              <div class="factor-card optimal">
                <h4>Temperature</h4>
                <div class="factor-value">31°C</div>
                <div class="factor-status">Optimal</div>
              </div>
              <div class="factor-card optimal">
                <h4>Soil Moisture</h4>
                <div class="factor-value">33%</div>
                <div class="factor-status">Good</div>
              </div>
              <div class="factor-card optimal">
                <h4>pH Level</h4>
                <div class="factor-value">6.8</div>
                <div class="factor-status">Optimal</div>
              </div>
              <div class="factor-card warning">
                <h4>Humidity</h4>
                <div class="factor-value">65%</div>
                <div class="factor-status">Moderate</div>
              </div>
            </div>
          </div>

          <div class="health-chart-container">
            <h3>📊 Health Score Breakdown</h3>
            <canvas id="healthScoreChart" width="200" height="200"></canvas>
          </div>
        </div>
      `;
    } else if (sectionId === 'reports') {
      contentHTML = `
        <div class="reports-content" style="display: block;">
          <div class="report-overview">
            <h3>📊 Performance Analytics</h3>
            <p>Comprehensive analysis of your farm's performance metrics and trends.</p>
          </div>
          
          <div class="report-metrics">
            <div class="metric-card">
              <h4>Average Soil Moisture</h4>
              <div class="metric-value" id="avgMoisture">33.2%</div>
              <div class="metric-trend">↑ 5% from last month</div>
            </div>
            <div class="metric-card">
              <h4>Irrigation Efficiency</h4>
              <div class="metric-value" id="irrigationEfficiency">92%</div>
              <div class="metric-trend">↑ 3% improvement</div>
            </div>
            <div class="metric-card">
              <h4>Nutrient Balance</h4>
              <div class="metric-value" id="nutrientBalance">Excellent</div>
              <div class="metric-trend">Stable</div>
            </div>
          </div>

          <div class="chart-container">
            <h4>📈 Growth Progress</h4>
            <canvas id="yieldChart" width="400" height="300"></canvas>
          </div>

          <div class="chart-container">
            <h4>💰 Cost Savings</h4>
            <canvas id="costSavingsChart" width="400" height="300"></canvas>
          </div>

          <div class="chart-container">
            <h4>💧 Water Usage Trend</h4>
            <canvas id="waterUsageChart" width="400" height="300"></canvas>
          </div>
        </div>
      `;
    } else if (sectionId === 'predictions') {
      contentHTML = `
        <div class="predictions-content" style="display: block;">
          <div class="prediction-overview">
            <h3>🔮 AI-Powered Predictions</h3>
            <p>Advanced machine learning models predict your farm's future performance.</p>
          </div>
          
          <div class="prediction-cards">
            <div class="prediction-card">
              <h4>🌾 Yield Prediction</h4>
              <div class="prediction-value" id="yieldPredictionValue">5175 kg/ha</div>
              <div class="prediction-confidence" id="yieldConfidence">92% confidence</div>
              <div class="prediction-factors">
                <div class="factors-grid" id="yieldFactors">
                  <div class="factor-item">
                    <span>Health</span>
                    <span>88%</span>
                  </div>
                  <div class="factor-item">
                    <span>Weather</span>
                    <span>85%</span>
                  </div>
                  <div class="factor-item">
                    <span>Soil</span>
                    <span>95%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="weather-impact">
            <h3>🌤️ Weather Impact Analysis</h3>
            <div id="weatherImpact">
              <div class="impact-summary">
                <h4>Overall Impact: Positive</h4>
                <p>Current weather conditions are favorable for crop growth and development.</p>
              </div>
            </div>
          </div>

          <div class="ai-recommendations-section">
            <h3>🤖 AI Recommendations</h3>
            <div id="aiRecommendations">
              <div class="ai-recommendation">
                <div class="ai-rec-header">
                  <span class="ai-rec-icon">🌱</span>
                  <strong>Optimal Growth Conditions</strong>
                </div>
                <p>AI analysis indicates excellent growing conditions. Continue current management practices.</p>
                <div class="ai-rec-priority">Priority: Low</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    const overlay = section.querySelector('.premium-section-overlay');
    if (overlay && contentHTML) {
      overlay.insertAdjacentHTML('afterend', contentHTML);
      console.log(`✅ Created content for ${sectionId}`);
    }
  }

  showUpgradeModal(suggestedPlan = 'pro') {
    const modal = document.getElementById('upgradeModal');
    const modalContent = document.getElementById('modalContent');
    
    if (!modal || !modalContent) return;
    
    modalContent.innerHTML = `
      <div class="upgrade-modal-content">
        <h2>🚀 Upgrade Your Plan</h2>
        <p>Unlock powerful features to maximize your farming potential!</p>
        
        <div class="modal-plans">
          <div class="modal-plan ${suggestedPlan === 'pro' ? 'recommended' : ''}">
            <div class="modal-plan-header">
              <h3>Pro Plan</h3>
              ${suggestedPlan === 'pro' ? '<div class="recommended-badge">Recommended</div>' : ''}
            </div>
            <div class="modal-plan-price">₹99/month</div>
            <ul class="modal-plan-features">
              <li>✓ Advanced sensors (pH, Humidity)</li>
              <li>✓ Crop health analysis</li>
              <li>✓ Data export (CSV)</li>
              <li>✓ Email/SMS alerts</li>
            </ul>
            <button class="modal-plan-btn" onclick="window.dashboard.subscribeToPlan('pro')">Choose Pro</button>
          </div>
          
          <div class="modal-plan ${suggestedPlan === 'premium' ? 'recommended' : ''}">
            <div class="modal-plan-header">
              <h3>Premium Plan</h3>
              ${suggestedPlan === 'premium' ? '<div class="recommended-badge">Recommended</div>' : ''}
            </div>
            <div class="modal-plan-price">₹199/month</div>
            <ul class="modal-plan-features">
              <li>✓ Everything in Pro</li>
              <li>✓ AI yield predictions</li>
              <li>✓ Advanced analytics & reports</li>
              <li>✓ Complete data export</li>
              <li>✓ Multi-farm management</li>
            </ul>
            <button class="modal-plan-btn premium" onclick="window.dashboard.subscribeToPlan('premium')">Choose Premium</button>
          </div>
        </div>
        
        <div class="modal-benefits">
          <h4>💡 What you'll get:</h4>
          <div class="modal-benefit-items">
            <div class="modal-benefit">📈 Increase yield by up to 25%</div>
            <div class="modal-benefit">💰 Reduce costs by up to 30%</div>
            <div class="modal-benefit">🤖 AI-powered recommendations</div>
            <div class="modal-benefit">📱 Real-time alerts and notifications</div>
          </div>
        </div>
      </div>
    `;
    
    modal.style.display = 'block';
  }

  closeUpgradeModal() {
    const modal = document.getElementById('upgradeModal');
    if (modal) modal.style.display = 'none';
  }

  subscribeToPlan(plan) {
    console.log('💳 Subscribing to plan:', plan);
    
    const buttons = document.querySelectorAll('.modal-plan-btn, .plan-btn');
    buttons.forEach(button => {
      if (button.textContent.toLowerCase().includes(plan.toLowerCase()) || 
          button.getAttribute('onclick')?.includes(plan)) {
        const originalText = button.textContent;
        button.textContent = 'Processing...';
        button.disabled = true;
        
        setTimeout(() => {
          this.currentPlan = plan;
          console.log('✅ Subscription updated to:', this.currentPlan);
          
          this.updateSubscriptionBadge();
          this.updateFeatureAccess();
          this.closeUpgradeModal();
          this.showSubscriptionSuccess(plan);
          
          // FIXED: Reinitialize charts and update data display
          if (this.chartsAvailable) {
            this.chartsInitialized = false;
            this.initializeAllCharts();
          }
          
          // FIXED: Refresh overview cards with current plan access
          if (this.data.current) {
            this.updateOverviewCardAccess();
          }
          
          button.textContent = originalText;
          button.disabled = false;
        }, 2000);
      }
    });
  }

  showSubscriptionSuccess(plan) {
    const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
    const alert = document.createElement('div');
    alert.className = 'success-alert';
    alert.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px; border-radius: 5px; z-index: 9999; box-shadow: 0 4px 8px rgba(0,0,0,0.2);';
    alert.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 20px;">🎉</span>
        <span>Successfully upgraded to ${planName} plan!</span>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px; padding: 0 5px;">×</button>
      </div>
    `;
    document.body.appendChild(alert);
    
    setTimeout(() => {
      if (alert.parentElement) alert.remove();
    }, 5000);
  }

  checkPremiumFeature(feature) {
    if (feature === 'export' && !this.hasAccess('export-csv') && !this.hasAccess('export-all')) {
      this.showUpgradeModal('pro');
      return false;
    }
    if (feature === 'crop-health' && !this.hasAccess('crop-health')) {
      this.showUpgradeModal('pro');
      return false;
    }
    if ((feature === 'reports' || feature === 'predictions') && !this.hasAccess('reports')) {
      this.showUpgradeModal('premium');
      return false;
    }
    return true;
  }

  // CORE METHODS
  checkRunningMode() {
    this.isServerMode = window.location.protocol === 'http:' || window.location.protocol === 'https:';
  }

  showLoading(show) {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.style.display = show ? 'flex' : 'none';
    }
  }

  async initializeSocket() {
    if (!this.socketAvailable) return Promise.resolve();

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

  // FIXED: Data Loading with Guaranteed Demo Data
  async fetchInitialData() {
    console.log('📡 Loading complete dashboard data...');
    
    // ALWAYS load demo data first to ensure we have data
    this.loadCompleteDemoData();
    
    // Then try to fetch real data if in server mode
    try {
      if (this.isServerMode) {
        const [currentResponse, forecastResponse] = await Promise.all([
          fetch('/api/current-data').catch(() => null),
          fetch('/api/forecast').catch(() => null)
        ]);

        if (currentResponse && currentResponse.ok && forecastResponse && forecastResponse.ok) {
          const currentData = await currentResponse.json();
          const forecastData = await forecastResponse.json();

          console.log('✅ Real API data received, updating demo data:', currentData);
          this.handleDataUpdate({
            ...currentData,
            forecast: forecastData.forecast
          });
        }
      }
    } catch (error) {
      console.error('API fetch error (using demo data):', error);
    }
  }

  // FIXED: Guaranteed Demo Data Loading
  loadCompleteDemoData() {
    console.log('🎭 Loading complete demo data...');
    
    const demoData = {
      weather: {
        temperature: 31.1,
        humidity: 65,
        pressure: 1013,
        windSpeed: 3.6,
        visibility: 4.5,
        uvIndex: 1,
        description: "haze"
      },
      soil: {
        moisture: 33.2,
        ph: 6.8,
        nitrogen: 68,
        phosphorus: 45,
        potassium: 72
      },
      cropHealth: {
        score: 88,
        growthStage: "Vegetative Growth",
        daysFromPlanting: 45,
        expectedHarvest: 75,
        factors: {
          temperature: { status: 'optimal', value: 31 },
          soilMoisture: { status: 'optimal', value: 33 },
          ph: { status: 'optimal', value: 6.8 },
          humidity: { status: 'moderate', value: 65 }
        }
      },
      yieldPrediction: {
        perHectare: 5175,
        confidence: 92,
        factors: {
          health: 88,
          weather: 85,
          soil: 95
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
      location: { city: "Bengalore" },
      timestamp: new Date().toISOString()
    };
    
    console.log('🎭 Demo data created:', demoData);
    
    // FIXED: Store data and populate dashboard
    this.data.current = demoData;
    this.handleDataUpdate(demoData);
    
    console.log('✅ Demo data loaded and stored successfully');
  }

  handleDataUpdate(data) {
    console.log('📊 Handling data update...');
    
    this.data.current = data;
    this.populateCompleteDashboard(data);
    
    // FIXED: Update feature access after data update
    this.updateOverviewCardAccess();
    
    console.log('✅ Dashboard updated with data');
  }

  // FIXED: Complete Dashboard Population
  populateCompleteDashboard(data) {
    console.log('📊 Populating complete dashboard with data:', data);

    // Basic Overview Cards - Always Available
    if (data.weather) {
      this.updateElement('overviewTemp', Math.round(data.weather.temperature) + '°C');
      this.updateElement('overviewTempStatus', 
        data.weather.temperature > 30 ? 'Hot' : data.weather.temperature < 15 ? 'Cold' : 'Optimal');
    }
    
    if (data.soil) {
      this.updateElement('overviewMoisture', data.soil.moisture.toFixed(1) + '%');
      this.updateElement('overviewMoistureStatus', 
        data.soil.moisture < 30 ? 'Low' : data.soil.moisture > 70 ? 'High' : 'Good');
    }
    
    // Location and Status
    if (data.location) {
      this.updateElement('locationName', data.location.city);
      this.updateElement('connectionStatus', 'Connected');
      const statusEl = document.getElementById('connectionStatus');
      if (statusEl) statusEl.className = 'connection-status connected';
    }
    
    // Populate ALL Sections
    this.populateAllSectionsComplete(data);
    
    console.log('✅ Complete dashboard populated');
  }

  populateAllSectionsComplete(data) {
    // Sensors Section
    if (data.weather && data.soil) {
      this.updateElement('sensorTemp', Math.round(data.weather.temperature) + '°C');
      this.updateElement('sensorMoisture', data.soil.moisture.toFixed(1) + '%');
      
      if (this.hasAccess('sensors-advanced')) {
        this.updateElement('sensorHumidity', data.weather.humidity + '%');
        this.updateElement('sensorPH', data.soil.ph.toFixed(2));
      }
      
      this.updateTrend('sensorTempTrend', data.weather.temperature, 25);
      this.updateTrend('sensorMoistureTrend', data.soil.moisture, 40);
      
      if (this.hasAccess('sensors-advanced')) {
        this.updateTrend('sensorHumidityTrend', data.weather.humidity, 60);
        this.updateTrend('sensorPHTrend', data.soil.ph, 6.5);
      }
    }
    
    // Weather Section
    if (data.weather) {
      this.updateElement('currentTemp', Math.round(data.weather.temperature) + '°C');
      this.updateElement('weatherDesc', data.weather.description);
      this.updateElement('windSpeed', data.weather.windSpeed.toFixed(1));
      this.updateElement('visibility', data.weather.visibility.toFixed(1));
      this.updateElement('uvIndex', data.weather.uvIndex);
      this.updateElement('currentWeatherIcon', this.getWeatherIcon(data.weather.description));
      
      this.populateWeatherForecast(data);
    }
    
    // Irrigation Section
    if (data.soil) {
      this.updateElement('irrigationSoilMoisture', data.soil.moisture.toFixed(1) + '%');
      this.updateElement('irrigationStatus', 
        data.soil.moisture < 25 ? 'Irrigation Required' : 
        data.soil.moisture < 40 ? 'Monitor Closely' : 'Optimal Level');
      
      const recContainer = document.getElementById('irrigationRecommendations');
      if (recContainer) {
        recContainer.innerHTML = `
          <div class="recommendation-card priority-medium">
            <div class="rec-type">IRRIGATION</div>
            <div class="rec-message">Soil moisture at ${data.soil.moisture.toFixed(1)}% - within acceptable range</div>
            <div class="rec-action">Next irrigation recommended in 2-3 days based on weather forecast</div>
          </div>
        `;
      }
    }
    
    // Fertilizer Section
    if (data.soil) {
      ['nitrogen', 'phosphorus', 'potassium'].forEach(nutrient => {
        const value = data.soil[nutrient] || Math.random() * 40 + 40;
        const fill = document.getElementById(`${nutrient}Fill`);
        const valueEl = document.getElementById(`${nutrient}Value`);
        
        if (fill) fill.style.width = value + '%';
        if (valueEl) valueEl.textContent = Math.round(value) + '%';
      });
      
      const fertRecContainer = document.getElementById('fertilizerRecommendations');
      if (fertRecContainer) {
        fertRecContainer.innerHTML = `
          <div class="recommendation-card priority-low">
            <div class="rec-type">NUTRIENT STATUS</div>
            <div class="rec-message">Current nutrient levels are balanced</div>
            <div class="rec-action">Continue regular fertilization schedule</div>
          </div>
        `;
      }
    }
    
    // Crop Health Section - PRO+ only
    if (data.cropHealth && this.hasAccess('crop-health')) {
      this.updateElement('healthScoreValue', Math.round(data.cropHealth.score) + '%');
      this.updateElement('healthStatus', 
        data.cropHealth.score > 80 ? 'Excellent' : data.cropHealth.score > 60 ? 'Good' : 'Fair');
      this.updateElement('growthStage', data.cropHealth.growthStage || 'Vegetative Growth');
      this.updateElement('daysFromPlanting', (data.cropHealth.daysFromPlanting || 45) + ' days');
      this.updateElement('expectedHarvest', (data.cropHealth.expectedHarvest || 75) + ' days');
      
      this.updateHealthFactors(data.cropHealth.factors);
    }
    
    // Reports Section - PREMIUM only
    if (this.hasAccess('reports')) {
      this.updateElement('avgMoisture', data.soil?.moisture.toFixed(1) + '%' || '33.2%');
      this.updateElement('irrigationEfficiency', '92%');
      this.updateElement('nutrientBalance', 'Excellent');
    }
    
    // Predictions Section - PREMIUM only
    if (data.yieldPrediction && this.hasAccess('predictions')) {
      this.updateElement('yieldPredictionValue', data.yieldPrediction.perHectare + ' kg/ha');
      this.updateElement('yieldConfidence', data.yieldPrediction.confidence + '%');
      
      const factorsContainer = document.getElementById('yieldFactors');
      if (factorsContainer) {
        factorsContainer.innerHTML = Object.entries(data.yieldPrediction.factors)
          .map(([key, value]) => `
            <div class="factor-item">
              <span>${key.charAt(0).toUpperCase() + key.slice(1)}</span>
              <span>${value}%</span>
            </div>
          `).join('');
      }
    }
    
    this.updateWeatherImpact(data);
    this.updateAIRecommendations(data);
  }

  populateWeatherForecast(data) {
    const forecast = data.forecast || this.generateFallbackForecast();
    const container = document.getElementById('forecastContainer');
    
    if (container) {
      container.innerHTML = forecast.slice(0, 7).map(day => `
        <div class="forecast-card">
          <div class="forecast-day">${day.date}</div>
          <div class="forecast-icon">${this.getWeatherIcon(day.description || 'clear sky')}</div>
          <div class="forecast-temp">${day.temperature?.max || '32'}°/${day.temperature?.min || '24'}°</div>
          <div class="forecast-rain">${day.rainfall || 0}mm</div>
        </div>
      `).join('');
    }
  }

  generateFallbackForecast() {
    return [
      { date: 'Mon', temperature: { max: 32, min: 24 }, rainfall: 0, description: 'clear sky' },
      { date: 'Tue', temperature: { max: 29, min: 22 }, rainfall: 2, description: 'light rain' },
      { date: 'Wed', temperature: { max: 28, min: 21 }, rainfall: 5, description: 'scattered clouds' },
      { date: 'Thu', temperature: { max: 26, min: 20 }, rainfall: 8, description: 'light rain' },
      { date: 'Fri', temperature: { max: 30, min: 23 }, rainfall: 0, description: 'clear sky' },
      { date: 'Sat', temperature: { max: 31, min: 24 }, rainfall: 1, description: 'few clouds' },
      { date: 'Sun', temperature: { max: 33, min: 25 }, rainfall: 0, description: 'clear sky' }
    ];
  }

  updateWeatherImpact(data) {
    const container = document.getElementById('weatherImpact');
    if (!container) return;

    const impact = data.weather.temperature > 30 ? 'Challenging' : 'Positive';
    
    container.innerHTML = `
      <div class="impact-summary">
        <h4>Overall Impact: ${impact}</h4>
        <p>Current weather conditions in ${data.location?.city || 'your area'} ${data.weather.temperature > 30 ? 'require careful monitoring due to high temperatures' : 'are favorable for crop growth'}.</p>
      </div>
      <div class="impact-factors">
        <div class="impact-factor">
          <span class="factor-name">Temperature: ${Math.round(data.weather.temperature)}°C</span>
          <span class="factor-impact ${data.weather.temperature > 30 ? 'negative' : 'positive'}">${data.weather.temperature > 30 ? 'High' : 'Good'}</span>
        </div>
        <div class="impact-factor">
          <span class="factor-name">Humidity: ${data.weather.humidity}%</span>
          <span class="factor-impact neutral">Moderate</span>
        </div>
        <div class="impact-factor">
          <span class="factor-name">Soil Moisture</span>
          <span class="factor-impact positive">Good</span>
        </div>
      </div>
    `;
  }

  updateAIRecommendations(data) {
    let recommendations = [];
    
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
        icon: '🌱',
        title: 'Maintain Excellence',
        description: `Crop health is excellent at ${Math.round(data.cropHealth.score)}%. Continue current management practices.`,
        priority: 'Low'
      });
    }
    
    if (data.soil?.moisture < 40) {
      recommendations.push({
        icon: '💧',
        title: 'Smart Irrigation',
        description: `Soil moisture at ${data.soil.moisture.toFixed(1)}%. Monitor closely and irrigate within 24-48 hours.`,
        priority: 'Medium'
      });
    }
    
    recommendations.push({
      icon: '📈',
      title: 'Yield Optimization',
      description: `Based on current conditions, predicted yield is ${data.yieldPrediction?.perHectare || 4200} kg/ha.`,
      priority: 'Low'
    });
    
    const container = document.getElementById('aiRecommendations');
    if (container) {
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
      'snow': '🌨️',
      'mist': '🌫️',
      'haze': '🌫️',
      'partly cloudy': '⛅'
    };
    return icons[description] || '🌤️';
  }

  // FIXED: Export Data Functionality
  setupExportButton() {
    const exportBtns = [
      document.getElementById('quickExportBtn'),
      document.querySelector('[onclick*="export"]'),
      ...document.querySelectorAll('button')
    ].filter(btn => btn && (btn.textContent.includes('Export') || btn.id?.includes('export')));

    exportBtns.forEach(exportBtn => {
      if (exportBtn) {
        console.log('📊 Setting up export button:', exportBtn.textContent);
        
        exportBtn.onclick = null;
        exportBtn.removeAttribute('onclick');
        
        exportBtn.addEventListener('click', () => {
          console.log('📊 Export button clicked, checking access...');
          console.log('Current plan:', this.currentPlan);
          console.log('Has export-csv:', this.hasAccess('export-csv'));
          console.log('Has export-all:', this.hasAccess('export-all'));
          
          if (this.hasAccess('export-csv') || this.hasAccess('export-all')) {
            this.exportFarmData();
          } else {
            console.log('❌ No export access, showing upgrade modal');
            this.showUpgradeModal('pro');
          }
        });
      }
    });
  }

  exportFarmData() {
    console.log('📊 Exporting farm data...');
    
    const data = this.data.current;
    if (!data) {
      this.showNotification('❌ No data available for export', 'error');
      return;
    }
    
    // Generate CSV data
    const csvData = [
      ['Metric', 'Value', 'Status', 'Timestamp']
    ];
    
    // Basic data (available for export-csv)
    if (data.weather) {
      csvData.push(['Temperature', data.weather.temperature + '°C', 'Normal', new Date().toISOString()]);
      csvData.push(['Humidity', data.weather.humidity + '%', 'Normal', new Date().toISOString()]);
      csvData.push(['Wind Speed', data.weather.windSpeed + ' km/h', 'Normal', new Date().toISOString()]);
    }
    
    if (data.soil) {
      csvData.push(['Soil Moisture', data.soil.moisture + '%', 'Good', new Date().toISOString()]);
      csvData.push(['pH Level', data.soil.ph, 'Optimal', new Date().toISOString()]);
      csvData.push(['Nitrogen', data.soil.nitrogen + '%', 'Good', new Date().toISOString()]);
      csvData.push(['Phosphorus', data.soil.phosphorus + '%', 'Good', new Date().toISOString()]);
      csvData.push(['Potassium', data.soil.potassium + '%', 'Good', new Date().toISOString()]);
    }
    
    // Premium data (only if user has export-all access)
    if (this.hasAccess('export-all') && data.cropHealth) {
      csvData.push(['Crop Health Score', data.cropHealth.score + '%', 'Excellent', new Date().toISOString()]);
      csvData.push(['Growth Stage', data.cropHealth.growthStage, 'On Track', new Date().toISOString()]);
      csvData.push(['Days from Planting', data.cropHealth.daysFromPlanting + ' days', 'Normal', new Date().toISOString()]);
    }
    
    if (this.hasAccess('export-all') && data.yieldPrediction) {
      csvData.push(['Predicted Yield', data.yieldPrediction.perHectare + ' kg/ha', 
                    data.yieldPrediction.confidence + '% confidence', new Date().toISOString()]);
    }
    
    // Create CSV string
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farm-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    this.showNotification('✅ Farm data exported successfully!', 'success');
    console.log('✅ CSV file downloaded successfully');
  }

  // EVENT LISTENERS
  setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    this.setupNavigation();
    this.setupExportButton(); // Export button setup

    const quickIrrigateBtn = document.getElementById('quickIrrigateBtn');
    if (quickIrrigateBtn) {
      quickIrrigateBtn.onclick = () => {
        this.showNotification('💧 Irrigation system activated!', 'success');
      };
    }

    const viewAlertsBtn = document.getElementById('viewAlertsBtn');
    if (viewAlertsBtn) {
      viewAlertsBtn.onclick = () => {
        const dashboardBtn = document.querySelector('[data-target="dashboard"]');
        if (dashboardBtn) dashboardBtn.click();
      };
    }

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.onclick = () => {
        this.fetchInitialData();
      };
    }

    window.onclick = (event) => {
      const modal = document.getElementById('upgradeModal');
      if (event.target === modal) {
        this.closeUpgradeModal();
      }
    };

    console.log('✅ Event listeners set up complete');
  }

  setupNavigation() {
    console.log('🧭 Setting up navigation...');
    
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.panel');

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        
        if (btn.classList.contains('premium-required')) {
          if (target === 'crop-health' && !this.hasAccess('crop-health')) {
            this.showUpgradeModal('pro');
            return;
          }
          if ((target === 'reports' || target === 'predictions') && !this.hasAccess('reports')) {
            this.showUpgradeModal('premium');
            return;
          }
        }
        
        console.log('🔘 Navigation:', target);
        
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        sections.forEach(section => {
          if (section.id === target) {
            section.classList.remove('hidden');
          } else {
            section.classList.add('hidden');
          }
        });
      });
    });
    
    console.log('✅ Navigation setup complete');
  }

  // UTILITY METHODS
  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  updateDateTime() {
    const now = new Date();
    this.updateElement('currentDateTime', now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    }));
    this.updateElement('lastUpdate', `Last updated: ${now.toLocaleTimeString()}`);
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

  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 9999;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span>${this.getNotificationIcon(type)}</span>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '1';
    }, 100);

    setTimeout(() => {
      notification.style.opacity = '0';
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

  loadSettings() {
    const saved = localStorage.getItem('farmingDashboardSettings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
  }
}

// GLOBAL FUNCTIONS
window.showUpgradeModal = function(suggestedPlan = 'pro') {
  if (window.dashboard) {
    window.dashboard.showUpgradeModal(suggestedPlan);
  }
};

window.closeUpgradeModal = function() {
  if (window.dashboard) {
    window.dashboard.closeUpgradeModal();
  }
};

window.subscribeToPlan = function(plan) {
  if (window.dashboard) {
    window.dashboard.subscribeToPlan(plan);
  }
};

window.checkPremiumFeature = function(feature) {
  if (window.dashboard) {
    return window.dashboard.checkPremiumFeature(feature);
  }
  return false;
};
// Dark Mode Toggle - Add to your script.js
function initDarkMode() {
  // Create toggle button
  const headerRight = document.querySelector('.header-right');
  const toggle = document.createElement('button');
  toggle.className = 'dark-mode-toggle';
  toggle.innerHTML = '🌙';
  toggle.title = 'Toggle Dark Mode';
  
  // Insert before refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  headerRight.insertBefore(toggle, refreshBtn);
  
  // Check saved preference
  if (localStorage.getItem('darkMode') === 'true') {
    document.documentElement.classList.add('dark');
    toggle.innerHTML = '☀️';
  }
  
  // Toggle functionality
  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    toggle.innerHTML = isDark ? '☀️' : '🌙';
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initDarkMode);


// Initialize Dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Starting Complete Smart Farming Dashboard with Fixed Subscription Model...');
  
  setTimeout(() => {
    console.log('📄 DOM loaded, initializing complete dashboard...');
    window.dashboard = new SmartFarmingDashboard();
    console.log('✅ Complete Smart Farming Dashboard loaded successfully!');
  }, 500);
});
