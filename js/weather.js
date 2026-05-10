/**
 * 天气模块（mixin 模式）
 * 含和风天气+Open-Meteo双数据源、城市选择器
 * 通过 Object.assign(OfficeDashboard.prototype, WeatherPanel) 混入
 */
const WeatherPanel = {

    async loadWeather(options = {}) {
        const { skipGlobalLoading = false } = options;
        const weatherBody = document.getElementById('weatherBody');

        if (weatherBody) {
            this.renderWeatherStatus('正在获取天气...', 'weather-loading');
        }

        try {
            const savedCity = SecurityUtils.safeGetStorage('office_weather_city');
            let cityConfig = null;

            if (savedCity) {
                const trimmedCity = String(savedCity).trim();
                if (trimmedCity.startsWith('{')) {
                    cityConfig = safeJsonParse(trimmedCity, null);
                } else {
                    cityConfig = { name: trimmedCity };
                }
            }

            const presetCity = Array.isArray(this.weatherPresetCities)
                ? this.weatherPresetCities.find(city => city.name === cityConfig?.name)
                : null;

            cityConfig = {
                name: cityConfig?.name || presetCity?.name || '苏州',
                lat: Number(cityConfig?.lat ?? presetCity?.lat ?? 31.292622),
                lon: Number(cityConfig?.lon ?? presetCity?.lon ?? 120.599489)
            };

            if (!Number.isFinite(cityConfig.lat) || !Number.isFinite(cityConfig.lon)) {
                cityConfig = { name: '苏州', lat: 31.292622, lon: 120.599489 };
            }

            SecurityUtils.safeSetStorage('office_weather_city', JSON.stringify(cityConfig));
            localStorage.setItem('office_weather_city', cityConfig.name || '苏州');
            await this.fetchWeather(cityConfig.lat, cityConfig.lon, cityConfig.name, { skipGlobalLoading });
        } catch (e) {
            console.error('天气加载失败:', e);
            if (weatherBody) {
                this.renderWeatherStatus('获取天气失败', 'weather-loading');
            }
            throw e;
        }
    },

    renderWeatherStatus(message, className = 'weather-loading') {
        const weatherBody = document.getElementById('weatherBody');
        if (!weatherBody) return;

        const statusEl = document.createElement('div');
        statusEl.className = className;
        statusEl.textContent = message;

        weatherBody.replaceChildren(statusEl);
    },

    async fetchWeather(lat, lon, cityName, options = {}) {
        const weatherBody = document.getElementById('weatherBody');
        const location = `${Number(lon).toFixed(2)},${Number(lat).toFixed(2)}`;

        const renderWeatherResult = (weather) => {
            const { current, forecast, sourceLabel } = weather;

            this.currentWeatherData = {
                cityName,
                temperature: current.temperature,
                humidity: current.humidity,
                windSpeed: current.windSpeed,
                description: current.description,
                icon: current.icon,
                code: current.code,
                source: current.source
            };
            this.weatherForecastSummary = forecast;
            this.lastWeatherUpdatedAt = Date.now();
            this.updateHeaderWeatherDisplay();

            const weatherInfo = document.createElement('div');
            weatherInfo.className = 'weather-info';

            const iconEl = document.createElement('div');
            iconEl.className = 'weather-icon';
            iconEl.textContent = current.icon;

            const tempEl = document.createElement('div');
            tempEl.className = 'weather-temp';
            tempEl.textContent = `${current.temperature}°C`;

            const descEl = document.createElement('div');
            descEl.className = 'weather-desc';
            descEl.textContent = current.description;

            const detailEl = document.createElement('div');
            detailEl.className = 'weather-detail';
            detailEl.textContent = `湿度 ${current.humidity}% · 风速 ${current.windSpeed}km/h · ${sourceLabel}`;

            const cityRowEl = document.createElement('div');
            cityRowEl.className = 'weather-city-row';

            const cityEl = document.createElement('span');
            cityEl.className = 'weather-city';
            cityEl.textContent = cityName;

            const changeBtn = document.createElement('button');
            changeBtn.type = 'button';
            changeBtn.className = 'weather-change-btn';
            changeBtn.id = 'weatherChangeBtn';
            changeBtn.textContent = '切换城市';
            changeBtn.addEventListener('click', () => {
                this.showCitySelector();
            });

            cityRowEl.append(cityEl, changeBtn);
            weatherInfo.append(iconEl, tempEl, descEl, detailEl, cityRowEl);

            if (forecast.length) {
                const forecastEl = document.createElement('div');
                forecastEl.className = 'weather-forecast';

                forecast.forEach(item => {
                    const forecastDayEl = document.createElement('div');
                    forecastDayEl.className = 'forecast-day';

                    const forecastNameEl = document.createElement('span');
                    forecastNameEl.className = 'forecast-name';
                    forecastNameEl.textContent = item.label;

                    const forecastIconEl = document.createElement('span');
                    forecastIconEl.className = 'forecast-icon';
                    forecastIconEl.textContent = this.getWeatherIcon(item.code);

                    const forecastTempEl = document.createElement('span');
                    forecastTempEl.className = 'forecast-temp';
                    forecastTempEl.textContent = `${item.min}~${item.max}°`;

                    forecastDayEl.append(forecastNameEl, forecastIconEl, forecastTempEl);
                    forecastEl.appendChild(forecastDayEl);
                });

                weatherInfo.appendChild(forecastEl);
            }

            if (weatherBody) {
                weatherBody.replaceChildren(weatherInfo);
            }
        };

        const fetchQWeather = async () => {
            const apiKey = await cryptoManager.secureGetSecret('qweather_api_key');
            if (!apiKey) {
                throw new Error('未配置和风天气密钥');
            }

            const host = 'n55ctw84yb.re.qweatherapi.com';
            const baseUrl = `https://${host}`;
            const commonQuery = `location=${encodeURIComponent(location)}&lang=zh&unit=m&key=${encodeURIComponent(apiKey)}`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            try {
                const [nowResponse, dailyResponse] = await Promise.all([
                    fetch(`${baseUrl}/v7/weather/now?${commonQuery}`, {
                        method: 'GET',
                        headers: { 'Accept': 'application/json' },
                        signal: controller.signal
                    }),
                    fetch(`${baseUrl}/v7/weather/3d?${commonQuery}`, {
                        method: 'GET',
                        headers: { 'Accept': 'application/json' },
                        signal: controller.signal
                    })
                ]);

                if (!nowResponse.ok || !dailyResponse.ok) {
                    throw new Error('和风天气请求失败');
                }

                const [nowData, dailyData] = await Promise.all([
                    nowResponse.json(),
                    dailyResponse.json()
                ]);

                if (nowData.code !== '200' || !nowData.now) {
                    throw new Error('和风实时天气数据格式错误');
                }

                if (dailyData.code !== '200' || !Array.isArray(dailyData.daily)) {
                    throw new Error('和风天气预报数据格式错误');
                }

                return {
                    current: {
                        temperature: Math.round(Number(nowData.now.temp)),
                        humidity: Number(nowData.now.humidity),
                        windSpeed: Math.round(Number(nowData.now.windSpeed)),
                        code: Number(nowData.now.icon),
                        description: nowData.now.text || this.getWeatherDesc(Number(nowData.now.icon)),
                        icon: this.getWeatherIcon(Number(nowData.now.icon)),
                        source: 'qweather'
                    },
                    forecast: dailyData.daily.slice(0, 3).map((day, index) => ({
                        label: index === 0 ? '今天' : index === 1 ? '明天' : '后天',
                        max: Math.round(Number(day.tempMax)),
                        min: Math.round(Number(day.tempMin)),
                        code: Number(day.iconDay),
                        text: day.textDay || this.getWeatherDesc(Number(day.iconDay))
                    })),
                    sourceLabel: '和风天气'
                };
            } finally {
                clearTimeout(timeout);
            }
        };

        const fetchOpenMeteo = async () => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            try {
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FShanghai&forecast_days=3`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error('免费天气服务请求失败');
                }

                const data = await response.json();
                if (!data.current || !data.daily) {
                    throw new Error('免费天气服务数据格式错误');
                }

                const dailyCodes = Array.isArray(data.daily.weather_code) ? data.daily.weather_code : [];
                const dailyMax = Array.isArray(data.daily.temperature_2m_max) ? data.daily.temperature_2m_max : [];
                const dailyMin = Array.isArray(data.daily.temperature_2m_min) ? data.daily.temperature_2m_min : [];

                return {
                    current: {
                        temperature: Math.round(Number(data.current.temperature_2m)),
                        humidity: Number(data.current.relative_humidity_2m),
                        windSpeed: Math.round(Number(data.current.wind_speed_10m)),
                        code: Number(data.current.weather_code),
                        description: this.getWeatherDesc(Number(data.current.weather_code)),
                        icon: this.getWeatherIcon(Number(data.current.weather_code)),
                        source: 'open-meteo'
                    },
                    forecast: dailyCodes.slice(0, 3).map((code, index) => ({
                        label: index === 0 ? '今天' : index === 1 ? '明天' : '后天',
                        max: Math.round(Number(dailyMax[index])),
                        min: Math.round(Number(dailyMin[index])),
                        code: Number(code),
                        text: this.getWeatherDesc(Number(code))
                    })),
                    sourceLabel: '免费天气'
                };
            } finally {
                clearTimeout(timeout);
            }
        };

        try {
            if (weatherBody) {
                this.renderWeatherStatus('正在加载天气...', 'weather-loading');
            }

            let weather = null;

            try {
                weather = await fetchQWeather();
            } catch (qweatherError) {
                console.warn('和风天气获取失败，回退到免费天气:', qweatherError?.message || qweatherError);
                weather = await fetchOpenMeteo();
            }

            renderWeatherResult(weather);
        } catch (e) {
            console.error('天气获取失败:', e);
            this.currentWeatherData = null;
            this.weatherForecastSummary = [];
            this.lastWeatherUpdatedAt = null;
            this.updateHeaderWeatherDisplay();

            const errorEl = document.createElement('div');
            errorEl.className = 'weather-error';

            const iconEl = document.createElement('div');
            iconEl.textContent = '🌤️';

            const titleEl = document.createElement('div');
            titleEl.textContent = '天气获取失败';

            const detailEl = document.createElement('div');
            detailEl.style.fontSize = '12px';
            detailEl.style.color = 'var(--gray-500)';
            detailEl.style.marginTop = '8px';
            detailEl.textContent = '请检查网络连接';

            const retryBtn = document.createElement('button');
            retryBtn.type = 'button';
            retryBtn.className = 'weather-change-btn';
            retryBtn.id = 'weatherRetryChangeBtn';
            retryBtn.style.marginTop = '10px';
            retryBtn.textContent = '切换城市';
            retryBtn.addEventListener('click', () => {
                this.showCitySelector();
            });

            errorEl.append(iconEl, titleEl, detailEl, retryBtn);
            if (weatherBody) {
                weatherBody.replaceChildren(errorEl);
            }
        }
    },

    showCitySelector() {
        const weatherBody = document.getElementById('weatherBody');
        if (!weatherBody) return;

        const cities = this.weatherPresetCities;

        const selectorEl = document.createElement('div');
        selectorEl.className = 'city-selector';

        const titleEl = document.createElement('div');
        titleEl.className = 'city-selector-title';
        titleEl.textContent = '选择城市';

        const gridEl = document.createElement('div');
        gridEl.className = 'city-grid';

        cities.forEach(city => {
            const cityBtn = document.createElement('button');
            cityBtn.type = 'button';
            cityBtn.className = 'city-btn';
            cityBtn.textContent = city.name;
            cityBtn.addEventListener('click', () => {
                SecurityUtils.safeSetStorage('office_weather_city', JSON.stringify(city));
                localStorage.setItem('office_weather_city', city.name);
                this.fetchWeather(city.lat, city.lon, city.name);
            });
            gridEl.appendChild(cityBtn);
        });

        const customEl = document.createElement('div');
        customEl.className = 'city-custom';
        customEl.style.marginTop = '10px';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'customCityName';
        nameInput.placeholder = '自定义城市名';
        nameInput.style.width = '45%';
        nameInput.style.padding = '6px 8px';
        nameInput.style.border = '1px solid var(--border-color)';
        nameInput.style.borderRadius = '4px';
        nameInput.style.fontSize = '12px';

        const coordsInput = document.createElement('input');
        coordsInput.type = 'text';
        coordsInput.id = 'customCityCoords';
        coordsInput.placeholder = '纬度,经度';
        coordsInput.style.width = '35%';
        coordsInput.style.padding = '6px 8px';
        coordsInput.style.border = '1px solid var(--border-color)';
        coordsInput.style.borderRadius = '4px';
        coordsInput.style.fontSize = '12px';

        const customBtn = document.createElement('button');
        customBtn.type = 'button';
        customBtn.className = 'city-btn';
        customBtn.id = 'customCityBtn';
        customBtn.style.width = '18%';
        customBtn.textContent = '确定';
        customBtn.addEventListener('click', () => {
            const name = nameInput.value.trim();
            const coords = coordsInput.value.trim();
            if (!name || !coords) {
                this.showError('请输入城市名和坐标（纬度,经度）');
                return;
            }
            const parts = coords.split(',').map(s => parseFloat(s.trim()));
            if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
                this.showError('坐标格式错误，请输入: 纬度,经度');
                return;
            }
            const city = { name, lat: parts[0], lon: parts[1] };
            SecurityUtils.safeSetStorage('office_weather_city', JSON.stringify(city));
            localStorage.setItem('office_weather_city', city.name);
            this.fetchWeather(city.lat, city.lon, city.name);
        });

        customEl.append(nameInput, coordsInput, customBtn);
        selectorEl.append(titleEl, gridEl, customEl);
        weatherBody.replaceChildren(selectorEl);
    },

    getWeatherIcon(code) {
        if (code === 0 || code === 100 || code === 150) return '☀️';
        if ([1, 2, 101, 102, 103, 151, 152, 153].includes(code)) return '⛅';
        if ([3, 104, 154].includes(code)) return '☁️';
        if ([45, 48, 500, 501, 509, 510, 514, 515].includes(code)) return '🌫️';
        if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 350, 351, 399].includes(code)) return '🌧️';
        if ([71, 73, 75, 77, 85, 86, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 456, 457, 499].includes(code)) return '❄️';
        if ([95, 96, 99].includes(code)) return '⛈️';
        if ([502, 503, 504, 507, 508].includes(code)) return '🌪️';
        if ([511, 512, 513].includes(code)) return '🌬️';
        if ([900, 901].includes(code)) return '☀️';
        if (code === 999) return '❓';
        return '🌤️';
    },

    getWeatherDesc(code) {
        const map = {
            0: '晴', 1: '大部晴朗', 2: '局部多云', 3: '阴',
            45: '雾', 48: '冻雾',
            51: '小毛毛雨', 53: '毛毛雨', 55: '浓毛毛雨', 56: '小冻毛毛雨', 57: '浓冻毛毛雨',
            61: '小雨', 63: '中雨', 65: '大雨', 66: '小冻雨', 67: '大冻雨',
            71: '小雪', 73: '中雪', 75: '大雪', 77: '米雪',
            80: '小阵雨', 81: '中阵雨', 82: '暴雨阵雨', 85: '小阵雪', 86: '大阵雪',
            95: '雷暴', 96: '雷暴伴小冰雹', 99: '雷暴伴大冰雹',
            100: '晴', 101: '多云', 102: '少云', 103: '晴间多云', 104: '阴',
            150: '晴', 151: '多云', 152: '少云', 153: '晴间多云', 154: '阴',
            300: '阵雨', 301: '强阵雨', 302: '雷阵雨', 303: '强雷阵雨', 304: '雷阵雨伴有冰雹',
            305: '小雨', 306: '中雨', 307: '大雨', 308: '极端降雨', 309: '毛毛雨',
            310: '暴雨', 311: '大暴雨', 312: '特大暴雨', 313: '冻雨', 314: '小到中雨',
            315: '中到大雨', 316: '大到暴雨', 317: '暴雨到大暴雨', 318: '大暴雨到特大暴雨',
            350: '阵雨', 351: '强阵雨', 399: '雨',
            400: '小雪', 401: '中雪', 402: '大雪', 403: '暴雪', 404: '雨夹雪',
            405: '雨雪天气', 406: '阵雨夹雪', 407: '阵雪', 408: '小到中雪', 409: '中到大雪',
            410: '大到暴雪', 456: '阵雨夹雪', 457: '阵雪', 499: '雪',
            500: '薄雾', 501: '雾', 502: '霾', 503: '扬沙', 504: '浮尘', 507: '沙尘暴', 508: '强沙尘暴',
            509: '浓雾', 510: '强浓雾', 511: '中度霾', 512: '重度霾', 513: '严重霾', 514: '大雾', 515: '特强浓雾',
            900: '热', 901: '冷', 999: '未知'
        };
        return map[code] || '未知';
    }

};
