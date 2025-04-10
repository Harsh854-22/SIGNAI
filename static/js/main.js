document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const cameraPlaceholder = document.getElementById('cameraPlaceholder');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const toggleCameraBtn = document.getElementById('toggleCamera');
    const viewPhrasesBtn = document.getElementById('viewPhrasesBtn');
    const translationDisplay = document.getElementById('translationDisplay');
    const translationHistory = document.getElementById('translationHistory');
    const confidenceIndicator = document.getElementById('confidenceIndicator');
    const exportBtn = document.getElementById('exportBtn');
    const feedbackBtn = document.getElementById('feedbackBtn');
    const howToUseBtn = document.getElementById('howToUseBtn');
    const calibrationAlert = document.getElementById('calibrationAlert');
    const calibrationIssues = document.getElementById('calibrationIssues');
    const phraseSearch = document.getElementById('phraseSearch');
    const basicPhrasesContainer = document.getElementById('basicPhrases');
    const intermediatePhrasesContainer = document.getElementById('intermediatePhrases');
    const advancedPhrasesContainer = document.getElementById('advancedPhrases');
    const textToSpeechToggle = document.getElementById('textToSpeechToggle');
    const cameraSelect = document.getElementById('cameraSelect');
    const frameRateRange = document.getElementById('frameRateRange');
    const frameRateValue = document.getElementById('frameRateValue');
    const resolutionSelect = document.getElementById('resolutionSelect');
    const voiceSelect = document.getElementById('voiceSelect');
    const speechRateRange = document.getElementById('speechRateRange');
    const speechRateValue = document.getElementById('speechRateValue');
    const speechVolumeRange = document.getElementById('speechVolumeRange');
    const speechVolumeValue = document.getElementById('speechVolumeValue');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const showHandLandmarksToggle = document.getElementById('showHandLandmarksToggle');
    const showFaceLandmarksToggle = document.getElementById('showFaceLandmarksToggle');
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const phrasesTab = document.getElementById('phrases-tab');
    const translateTab = document.getElementById('translate-tab');
    
    // Bootstrap components
    const phraseDetailModal = new bootstrap.Modal(document.getElementById('phraseDetailModal'));
    const feedbackModal = new bootstrap.Modal(document.getElementById('feedbackModal'));
    const howToUseModal = new bootstrap.Modal(document.getElementById('howToUseModal'));
    
    // Socket.io connection
    const socket = io();
    
    // State variables
    let isStreaming = false;
    let sessionId = null;
    let translationData = [];
    let selectedFeedbackType = null;
    let aslPhrases = {};
    let phraseComplexity = {};
    let lastTranslation = "";
    let textToSpeechEnabled = true;
    let frameInterval = null;
    let frameRate = 10; // frames per second
    let selectedVoice = null;
    let speechRate = 1.0;
    let speechVolume = 1.0;
    let availableCameras = [];
    let selectedCamera = null;
    let selectedResolution = 'medium';
    let darkMode = false;
    let showHandLandmarks = true;
    let showFaceLandmarks = false;
    let currentPhrase = "";
    
    // Resolution settings
    const resolutions = {
        low: { width: 320, height: 240 },
        medium: { width: 640, height: 480 },
        high: { width: 1280, height: 720 }
    };
    
    // Text-to-speech setup
    const synth = window.speechSynthesis;
    let voices = [];
    
    // Initialize settings from localStorage
    function loadSettings() {
        if (localStorage.getItem('signai-settings')) {
            try {
                const settings = JSON.parse(localStorage.getItem('signai-settings'));
                
                // Apply settings
                frameRate = settings.frameRate || 10;
                frameRateRange.value = frameRate;
                frameRateValue.textContent = frameRate;
                
                selectedResolution = settings.resolution || 'medium';
                resolutionSelect.value = selectedResolution;
                
                textToSpeechEnabled = settings.textToSpeech !== undefined ? settings.textToSpeech : true;
                textToSpeechToggle.checked = textToSpeechEnabled;
                
                speechRate = settings.speechRate || 1.0;
                speechRateRange.value = speechRate;
                speechRateValue.textContent = speechRate;
                
                speechVolume = settings.speechVolume || 1.0;
                speechVolumeRange.value = speechVolume;
                speechVolumeValue.textContent = Math.round(speechVolume * 100);
                
                darkMode = settings.darkMode || false;
                darkModeToggle.checked = darkMode;
                if (darkMode) {
                    document.body.classList.add('dark-mode');
                }
                
                showHandLandmarks = settings.showHandLandmarks !== undefined ? settings.showHandLandmarks : true;
                showHandLandmarksToggle.checked = showHandLandmarks;
                
                showFaceLandmarks = settings.showFaceLandmarks || false;
                showFaceLandmarksToggle.checked = showFaceLandmarks;
                
                // Selected voice will be set after voices are loaded
            } catch (e) {
                console.error('Error loading settings:', e);
            }
        }
    }
    
    // Save settings to localStorage
    function saveSettings() {
        const settings = {
            frameRate: parseInt(frameRateRange.value),
            resolution: resolutionSelect.value,
            textToSpeech: textToSpeechToggle.checked,
            speechRate: parseFloat(speechRateRange.value),
            speechVolume: parseFloat(speechVolumeRange.value),
            darkMode: darkModeToggle.checked,
            showHandLandmarks: showHandLandmarksToggle.checked,
            showFaceLandmarks: showFaceLandmarksToggle.checked,
            selectedVoiceURI: selectedVoice ? selectedVoice.voiceURI : null
        };
        
        localStorage.setItem('signai-settings', JSON.stringify(settings));
        
        // Show confirmation
        const toast = document.createElement('div');
        toast.className = 'position-fixed bottom-0 end-0 p-3';
        toast.style.zIndex = '5';
        toast.innerHTML = `
            <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <strong class="me-auto">Settings</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    Settings saved successfully!
                </div>
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }
    
    // Reset settings to defaults
    function resetSettings() {
        frameRate = 10;
        frameRateRange.value = frameRate;
        frameRateValue.textContent = frameRate;
        
        selectedResolution = 'medium';
        resolutionSelect.value = selectedResolution;
        
        textToSpeechEnabled = true;
        textToSpeechToggle.checked = textToSpeechEnabled;
        
        speechRate = 1.0;
        speechRateRange.value = speechRate;
        speechRateValue.textContent = speechRate;
        
        speechVolume = 1.0;
        speechVolumeRange.value = speechVolume;
        speechVolumeValue.textContent = Math.round(speechVolume * 100);
        
        darkMode = false;
        darkModeToggle.checked = darkMode;
        document.body.classList.remove('dark-mode');
        
        showHandLandmarks = true;
        showHandLandmarksToggle.checked = showHandLandmarks;
        
        showFaceLandmarks = false;
        showFaceLandmarksToggle.checked = showFaceLandmarks;
        
        voiceSelect.selectedIndex = 0;
        selectedVoice = voices[0];
        
        saveSettings();
    }
    
    // Get available voices
    function loadVoices() {
        voices = synth.getVoices();
        voiceSelect.innerHTML = '';
        
        voices.forEach((voice, i) => {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${voice.name} (${voice.lang})`;
            voiceSelect.appendChild(option);
        });
        
        let defaultVoice = voices.findIndex(v => v.name.includes('Female') && v.lang.includes('en'));
        if (defaultVoice === -1) defaultVoice = voices.findIndex(v => v.lang.includes('en'));
        if (defaultVoice === -1) defaultVoice = 0;
        
        if (localStorage.getItem('signai-settings')) {
            try {
                const settings = JSON.parse(localStorage.getItem('signai-settings'));
                if (settings.selectedVoiceURI) {
                    const savedVoiceIndex = voices.findIndex(v => v.voiceURI === settings.selectedVoiceURI);
                    if (savedVoiceIndex !== -1) defaultVoice = savedVoiceIndex;
                }
            } catch (e) {
                console.error('Error loading voice setting:', e);
            }
        }
        
        voiceSelect.selectedIndex = defaultVoice;
        selectedVoice = voices[defaultVoice];
    }
    
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
    }
    
    loadVoices();
    
    // Get available cameras
    async function loadCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            cameraSelect.innerHTML = '';
            
            videoDevices.forEach((device, i) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Camera ${i + 1}`;
                cameraSelect.appendChild(option);
                availableCameras.push(device);
            });
            
            if (videoDevices.length > 0) {
                selectedCamera = videoDevices[0].deviceId;
            }
        } catch (error) {
            console.error('Error loading cameras:', error);
            cameraSelect.innerHTML = '<option value="">No cameras found</option>';
        }
    }
    
    // Speak text function
    function speakText(text) {
        if (!textToSpeechEnabled || !text || text === lastTranslation) return;
        
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        utterance.pitch = 1;
        utterance.rate = speechRate;
        utterance.volume = speechVolume;
        
        synth.speak(utterance);
        lastTranslation = text;
    }
    
    // Socket events
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('connected', (data) => {
        sessionId = data.session_id;
        console.log('Session ID:', sessionId);
        
        if (data.phrases) aslPhrases = data.phrases;
        if (data.phrase_complexity) phraseComplexity = data.phrase_complexity;
        
        initializePhraseList();
    });
    
    socket.on('processed_frame', (data) => {
        if (!isStreaming) return;
        
        loadingIndicator.classList.add('d-none');
        
        const img = new Image();
        img.onload = () => {
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = data.image;
        
        if (data.translation) {
            translationDisplay.innerHTML = `<span class="translation-text">${data.translation}</span>`;
            speakText(data.translation);
            updateConfidenceIndicator(data.confidence);
            
            const lastTranslation = translationData.length > 0 ? translationData[translationData.length - 1].text : null;
            if (lastTranslation !== data.translation || data.confidence === 'high') {
                addToTranslationHistory(data.translation, data.confidence);
            }
        }
        
        if (data.calibration && !data.calibration.isGood) {
            calibrationAlert.classList.remove('d-none');
            calibrationIssues.innerHTML = data.calibration.issues.map(issue => `• ${issue}`).join('<br>');
        } else {
            calibrationAlert.classList.add('d-none');
        }
    });
    
    socket.on('translation_history', (data) => {
        translationData = data.history;
        renderTranslationHistory();
    });
    
    socket.on('export_result', (data) => {
        const blob = new Blob([data.text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    socket.on('phrases_data', (data) => {
        aslPhrases = data.phrases;
        phraseComplexity = data.phrase_complexity;
        initializePhraseList();
    });
    
    // Event listeners
    toggleCameraBtn.addEventListener('click', toggleCamera);
    viewPhrasesBtn.addEventListener('click', () => phrasesTab.click());
    exportBtn.addEventListener('click', exportTranslations);
    feedbackBtn.addEventListener('click', () => feedbackModal.show());
    howToUseBtn.addEventListener('click', () => howToUseModal.show());
    
    frameRateRange.addEventListener('input', () => {
        frameRateValue.textContent = frameRateRange.value;
        frameRate = parseInt(frameRateRange.value);
        if (isStreaming) restartCamera();
    });
    
    resolutionSelect.addEventListener('change', () => {
        selectedResolution = resolutionSelect.value;
        if (isStreaming) restartCamera();
    });
    
    cameraSelect.addEventListener('change', () => {
        selectedCamera = cameraSelect.value;
        if (isStreaming) restartCamera();
    });
    
    voiceSelect.addEventListener('change', () => {
        const selectedIndex = voiceSelect.selectedIndex;
        selectedVoice = voices[selectedIndex];
    });
    
    speechRateRange.addEventListener('input', () => {
        speechRate = parseFloat(speechRateRange.value);
        speechRateValue.textContent = speechRate.toFixed(1);
    });
    
    speechVolumeRange.addEventListener('input', () => {
        speechVolume = parseFloat(speechVolumeRange.value);
        speechVolumeValue.textContent = Math.round(speechVolume * 100);
    });
    
    darkModeToggle.addEventListener('change', () => {
        if (darkModeToggle.checked) {
            document.body.classList.add('dark-mode');
            darkMode = true;
        } else {
            document.body.classList.remove('dark-mode');
            darkMode = false;
        }
    });
    
    resetSettingsBtn.addEventListener('click', resetSettings);
    saveSettingsBtn.addEventListener('click', saveSettings);
    
    document.getElementById('positiveFeedback').addEventListener('click', () => {
        selectedFeedbackType = 'positive';
        document.getElementById('positiveFeedback').classList.add('btn-primary');
        document.getElementById('positiveFeedback').classList.remove('btn-outline-primary');
        document.getElementById('negativeFeedback').classList.add('btn-outline-primary');
        document.getElementById('negativeFeedback').classList.remove('btn-primary');
    });
    
    document.getElementById('negativeFeedback').addEventListener('click', () => {
        selectedFeedbackType = 'negative';
        document.getElementById('negativeFeedback').classList.add('btn-primary');
        document.getElementById('negativeFeedback').classList.remove('btn-outline-primary');
        document.getElementById('positiveFeedback').classList.add('btn-outline-primary');
        document.getElementById('positiveFeedback').classList.remove('btn-primary');
    });
    
    document.getElementById('submitFeedback').addEventListener('click', () => {
        const email = document.getElementById('feedbackEmail').value;
        const feedback = document.getElementById('feedbackText').value;
        
        if (!selectedFeedbackType || !feedback) {
            alert('Please select a feedback type and provide your feedback.');
            return;
        }
        
        const submitBtn = document.getElementById('submitFeedback');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        
        fetch('/submit_feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                feedbackType: selectedFeedbackType,
                email: email,
                feedback: feedback
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Thank you for your feedback! It helps us improve SignAI.');
                selectedFeedbackType = null;
                document.getElementById('feedbackEmail').value = '';
                document.getElementById('feedbackText').value = '';
                document.getElementById('positiveFeedback').classList.add('btn-outline-primary');
                document.getElementById('positiveFeedback').classList.remove('btn-primary');
                document.getElementById('negativeFeedback').classList.add('btn-outline-primary');
                document.getElementById('negativeFeedback').classList.remove('btn-primary');
                feedbackModal.hide();
            } else {
                alert('Error submitting feedback: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error submitting feedback. Please try again.');
        })
        .finally(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    });
    
    document.getElementById('speakPhraseBtn').addEventListener('click', () => {
        if (currentPhrase) speakText(currentPhrase);
    });
    
    phraseSearch.addEventListener('input', () => {
        const searchTerm = phraseSearch.value.toLowerCase();
        renderPhraseList(searchTerm);
    });
    
    // Initialize
    loadSettings();
    loadCameras();
    socket.emit('get_phrases');
    
    // Camera functions
    function toggleCamera() {
        if (isStreaming) stopCamera();
        else startCamera();
    }
    
    async function startCamera() {
        try {
            loadingIndicator.classList.remove('d-none');
            cameraPlaceholder.style.display = 'none';
            video.style.display = 'block';
            canvas.style.display = 'block';
            
            const constraints = {
                video: {
                    deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
                    width: { ideal: resolutions[selectedResolution].width },
                    height: { ideal: resolutions[selectedResolution].height },
                    facingMode: "user",
                    frameRate: { ideal: frameRate }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    resolve();
                };
            });

            isStreaming = true;
            toggleCameraBtn.innerHTML = '<i class="fas fa-video-slash me-1"></i> Stop Camera';
            toggleCameraBtn.classList.replace('btn-primary', 'btn-danger');
            
            frameInterval = setInterval(sendFrame, 1000 / frameRate);
            loadingIndicator.classList.add('d-none');
            
        } catch (error) {
            console.error('Camera Error:', error);
            loadingIndicator.classList.add('d-none');
            
            cameraPlaceholder.innerHTML = `
                <div class="alert alert-warning m-2">
                    <h4>Camera Error</h4>
                    <p>${getUserFriendlyError(error)}</p>
                    <div class="d-flex gap-2 mt-2">
                        <button class="btn btn-sm btn-primary" onclick="location.reload()">
                            <i class="fas fa-sync-alt me-1"></i> Reload
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="startMockCamera()">
                            <i class="fas fa-eye me-1"></i> Try Mock Camera
                        </button>
                    </div>
                </div>
            `;
            cameraPlaceholder.style.display = 'flex';
        }
    }

    function getUserFriendlyError(error) {
        switch(error.name) {
            case 'NotAllowedError': return 'Please allow camera permissions in your browser settings.';
            case 'NotFoundError': return 'No camera device found.';
            case 'NotReadableError': return 'Camera is already in use by another application.';
            default: return 'Could not access camera. Please try again.';
        }
    }

    function startMockCamera() {
        isStreaming = true;
        cameraPlaceholder.style.display = 'none';
        video.style.display = 'none';
        canvas.style.display = 'block';
        
        canvas.width = 640;
        canvas.height = 480;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Mock Camera Feed', canvas.width/2, canvas.height/2);
        ctx.font = '16px Arial';
        ctx.fillText('(Camera access not available)', canvas.width/2, canvas.height/2 + 30);
        
        ctx.fillStyle = '#ffcc99';
        ctx.beginPath();
        ctx.arc(canvas.width/2, canvas.height/3, 50, 0, Math.PI * 2);
        ctx.fill();
        
        toggleCameraBtn.innerHTML = '<i class="fas fa-video-slash me-1"></i> Stop Camera';
        toggleCameraBtn.classList.replace('btn-primary', 'btn-danger');
        
        frameInterval = setInterval(() => {
            const mockTranslations = ['Hello', 'Thank you', 'Help', 'Yes', 'No'];
            const randomTranslation = mockTranslations[Math.floor(Math.random() * mockTranslations.length)];
            
            if (Math.random() > 0.7) {
                translationDisplay.textContent = randomTranslation;
                addToTranslationHistory(randomTranslation, Math.random() > 0.5 ? 'high' : 'medium');
            }
        }, 1000);
    }

    function stopCamera() {
        if (frameInterval) {
            clearInterval(frameInterval);
            frameInterval = null;
        }
        
        if (video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }
        
        isStreaming = false;
        cameraPlaceholder.style.display = 'flex';
        video.style.display = 'none';
        canvas.style.display = 'none';
        toggleCameraBtn.innerHTML = '<i class="fas fa-video me-1"></i> Start Camera';
        toggleCameraBtn.classList.remove('btn-danger');
        toggleCameraBtn.classList.add('btn-primary');
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        calibrationAlert.classList.add('d-none');
        loadingIndicator.classList.add('d-none');
    }

    function restartCamera() {
        if (isStreaming) {
            stopCamera();
            setTimeout(() => startCamera(), 500);
        }
    }

    function sendFrame() {
        if (!isStreaming) return;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.5);
        
        socket.emit('frame', { 
            image: imageData,
            showHandLandmarks: showHandLandmarks,
            showFaceLandmarks: showFaceLandmarks
        });
    }
    
    function updateConfidenceIndicator(confidence) {
        let badgeClass = 'bg-warning';
        let icon = '<i class="fas fa-question-circle me-1"></i>';
        
        if (confidence === 'high') {
            badgeClass = 'bg-success';
            icon = '<i class="fas fa-check-circle me-1"></i>';
        } else if (confidence === 'low') {
            badgeClass = 'bg-danger';
            icon = '<i class="fas fa-exclamation-circle me-1"></i>';
        }
        
        confidenceIndicator.innerHTML = `<span class="badge ${badgeClass} me-1">${icon}${confidence.charAt(0).toUpperCase() + confidence.slice(1)}</span>`;
    }
    
    function addToTranslationHistory(text, confidence) {
        const timestamp = new Date().getTime();
        translationData.push({ text, timestamp, confidence });
        renderTranslationHistory();
    }
    
    function renderTranslationHistory() {
        if (translationData.length === 0) {
            translationHistory.innerHTML = '<p class="text-muted small p-2">No translations yet</p>';
            exportBtn.disabled = true;
            return;
        }
        
        exportBtn.disabled = false;
        translationHistory.innerHTML = '';
        
        translationData.forEach(entry => {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            const confidenceClass = `history-item-${entry.confidence}`;
            
            const historyItem = document.createElement('div');
            historyItem.className = `history-item ${confidenceClass}`;
            historyItem.innerHTML = `
                <div>${entry.text}</div>
                <div class="history-timestamp">${time}</div>
            `;
            
            const speakButton = document.createElement('button');
            speakButton.className = 'btn btn-sm btn-outline-primary';
            speakButton.innerHTML = '<i class="fas fa-volume-up"></i>';
            speakButton.addEventListener('click', () => speakText(entry.text));
            historyItem.appendChild(speakButton);
            
            translationHistory.appendChild(historyItem);
        });
        
        translationHistory.scrollTop = translationHistory.scrollHeight;
    }
    
    function exportTranslations() {
        socket.emit('export_translations');
    }
    
    function initializePhraseList() {
        renderPhraseList();
    }
    
    function renderPhraseList(searchTerm = '') {
        basicPhrasesContainer.innerHTML = '';
        intermediatePhrasesContainer.innerHTML = '';
        advancedPhrasesContainer.innerHTML = '';
        
        let basicCount = 0, intermediateCount = 0, advancedCount = 0;
        
        Object.entries(aslPhrases).forEach(([key, phrase]) => {
            if (searchTerm && !phrase.toLowerCase().includes(searchTerm)) return;
            
            const complexity = phraseComplexity[key] || 'basic';
            const phraseButton = document.createElement('div');
            phraseButton.className = 'col-md-4 col-sm-6 mb-2';
            phraseButton.innerHTML = `
                <button class="btn btn-outline-primary w-100 phrase-btn" 
                        data-key="${key}" 
                        data-phrase="${phrase}"
                        data-complexity="${complexity}">
                    ${phrase}
                </button>
            `;
            
            phraseButton.querySelector('button').addEventListener('click', () => {
                showPhraseDetail(key, phrase, complexity);
            });
            
            if (complexity === 'basic') {
                basicPhrasesContainer.appendChild(phraseButton);
                basicCount++;
            } else if (complexity === 'intermediate') {
                intermediatePhrasesContainer.appendChild(phraseButton);
                intermediateCount++;
            } else {
                advancedPhrasesContainer.appendChild(phraseButton);
                advancedCount++;
            }
        });
        
        document.querySelector('#basic-tab .badge').textContent = basicCount;
        document.querySelector('#intermediate-tab .badge').textContent = intermediateCount;
        document.querySelector('#advanced-tab .badge').textContent = advancedCount;
    }
    
    function showPhraseDetail(key, phrase, complexity) {
        const phraseDetailText = document.getElementById('phraseDetailText');
        const phraseComplexity = document.getElementById('phraseComplexity');
        
        phraseDetailText.textContent = `To sign "${phrase}", make the "${key.replace(/_/g, ' ')}" gesture.`;
        currentPhrase = phrase;
        
        phraseComplexity.textContent = complexity.charAt(0).toUpperCase() + complexity.slice(1);
        phraseComplexity.className = 'badge';
        
        if (complexity === 'basic') {
            phraseComplexity.classList.add('bg-success');
        } else if (complexity === 'intermediate') {
            phraseComplexity.classList.add('bg-warning');
        } else {
            phraseComplexity.classList.add('bg-danger');
        }
        
        phraseDetailModal.show();
    }
});