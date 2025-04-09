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
                // Continue with defaults
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
        
        // Remove toast after 3 seconds
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
        
        // Reset voice to default
        voiceSelect.selectedIndex = 0;
        selectedVoice = voices[0];
        
        // Save the reset settings
        saveSettings();
    }
    
    // Get available voices
    function loadVoices() {
        voices = synth.getVoices();
        
        // Clear existing options
        voiceSelect.innerHTML = '';
        
        // Add voices to select
        voices.forEach((voice, i) => {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${voice.name} (${voice.lang})`;
            voiceSelect.appendChild(option);
        });
        
        // Try to select a female English voice by default
        let defaultVoice = voices.findIndex(v => v.name.includes('Female') && v.lang.includes('en'));
        if (defaultVoice === -1) {
            defaultVoice = voices.findIndex(v => v.lang.includes('en'));
        }
        if (defaultVoice === -1) {
            defaultVoice = 0;
        }
        
        // Check if we have a saved voice preference
        if (localStorage.getItem('signai-settings')) {
            try {
                const settings = JSON.parse(localStorage.getItem('signai-settings'));
                if (settings.selectedVoiceURI) {
                    const savedVoiceIndex = voices.findIndex(v => v.voiceURI === settings.selectedVoiceURI);
                    if (savedVoiceIndex !== -1) {
                        defaultVoice = savedVoiceIndex;
                    }
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
            
            // Clear existing options
            cameraSelect.innerHTML = '';
            
            // Add cameras to select
            videoDevices.forEach((device, i) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Camera ${i + 1}`;
                cameraSelect.appendChild(option);
                
                availableCameras.push(device);
            });
            
            // Select first camera by default
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
        
        // Stop any current speech
        synth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set selected voice
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
        
        // Store phrases data
        if (data.phrases) {
            aslPhrases = data.phrases;
        }
        
        if (data.phrase_complexity) {
            phraseComplexity = data.phrase_complexity;
        }
        
        // Initialize phrase list
        initializePhraseList();
    });
    
    socket.on('processed_frame', (data) => {
        if (!isStreaming) return;
        
        // Hide loading indicator if visible
        loadingIndicator.classList.add('d-none');
        
        // Update the canvas with the processed frame
        const img = new Image();
        img.onload = () => {
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = data.image;
        
        // Update translation display if there's a translation
        if (data.translation) {
            translationDisplay.innerHTML = `<span class="translation-text">${data.translation}</span>`;
            
            // Speak the translation
            speakText(data.translation);
            
            // Update confidence indicator
            updateConfidenceIndicator(data.confidence);
            
            // Add to translation history if it's new
            const lastTranslation = translationData.length > 0 ? translationData[translationData.length - 1].text : null;
            if (lastTranslation !== data.translation || data.confidence === 'high') {
                addToTranslationHistory(data.translation, data.confidence);
            }
        }
        
        // Show calibration issues if any
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
        // Create a download link for the exported text
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
    viewPhrasesBtn.addEventListener('click', () => {
        phrasesTab.click();
    });
    exportBtn.addEventListener('click', exportTranslations);
    feedbackBtn.addEventListener('click', () => {
        feedbackModal.show();
    });
    howToUseBtn.addEventListener('click', () => {
        howToUseModal.show();
    });
    
    // Settings event listeners
    frameRateRange.addEventListener('input', () => {
        frameRateValue.textContent = frameRateRange.value;
        frameRate = parseInt(frameRateRange.value);
        
        // If camera is active, restart it with new frame rate
        if (isStreaming) {
            restartCamera();
        }
    });
    
    resolutionSelect.addEventListener('change', () => {
        selectedResolution = resolutionSelect.value;
        
        // If camera is active, restart it with new resolution
        if (isStreaming) {
            restartCamera();
        }
    });
    
    cameraSelect.addEventListener('change', () => {
        selectedCamera = cameraSelect.value;
        
        // If camera is active, restart it with new camera
        if (isStreaming) {
            restartCamera();
        }
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
    
    // Feedback modal events
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
        
        // Show loading state
        const submitBtn = document.getElementById('submitFeedback');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        
        // Send feedback to server
        fetch('/submit_feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                feedbackType: selectedFeedbackType,
                email: email,
                feedback: feedback
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message
                alert('Thank you for your feedback! It helps us improve SignAI.');
                
                // Reset form and close modal
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
            // Reset button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    });
    
    // Speak phrase in modal
    document.getElementById('speakPhraseBtn').addEventListener('click', () => {
        if (currentPhrase) {
            speakText(currentPhrase);
        }
    });
    
    // Phrase search
    phraseSearch.addEventListener('input', () => {
        const searchTerm = phraseSearch.value.toLowerCase();
        renderPhraseList(searchTerm);
    });
    
    // Initialize
    loadSettings();
    loadCameras();
    
    // Request phrases data from server
    socket.emit('get_phrases');
    
    // Functions
    function toggleCamera() {
        if (isStreaming) {
            stopCamera();
        } else {
            startCamera();
        }
    }
    
    function startCamera() {
        // Show loading indicator
        loadingIndicator.classList.remove('d-none');
        
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const resolution = resolutions[selectedResolution];
            
            const constraints = {
                video: {
                    deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
                    width: { ideal: resolution.width },
                    height: { ideal: resolution.height },
                    facingMode: "user"
                }
            };
            
            navigator.mediaDevices.getUserMedia(constraints)
                .then(function(stream) {
                    video.srcObject = stream;
                    video.play();
                    
                    // Set up canvas dimensions once video metadata is loaded
                    video.addEventListener('loadedmetadata', function() {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        
                        isStreaming = true;
                        cameraPlaceholder.style.display = 'none';
                        toggleCameraBtn.innerHTML = '<i class="fas fa-video-slash me-1"></i> Stop Camera';
                        toggleCameraBtn.classList.remove('btn-primary');
                        toggleCameraBtn.classList.add('btn-danger');
                        
                        // Start sending frames to the server at specified frame rate
                        frameInterval = setInterval(sendFrame, 1000 / frameRate);
                    });
                })
                .catch(function(error) {
                    console.error('Error accessing camera:', error);
                    loadingIndicator.classList.add('d-none');
                    
                    let errorMessage = 'Error accessing camera: ';
                    if (error.name === 'NotAllowedError') {
                        errorMessage += 'Camera access was denied. Please allow camera permissions in your browser settings.';
                    } else if (error.name === 'NotFoundError') {
                        errorMessage += 'No camera found. Please check if a camera is connected.';
                    } else if (error.name === 'NotReadableError') {
                        errorMessage += 'Camera is already in use by another application.';
                    } else if (error.name === 'OverconstrainedError') {
                        errorMessage += 'Requested camera configuration not available. Trying default settings...';
                        // Try again with simpler constraints
                        startCameraWithDefaultConstraints();
                        return;
                    } else {
                        errorMessage += 'Please check your camera connection and permissions.';
                    }
                    
                    // Show error in placeholder
                    cameraPlaceholder.innerHTML = `
                        <div class="text-center">
                            <i class="fas fa-video-slash text-danger mb-2" style="font-size: 2rem;"></i>
                            <p class="text-danger">${errorMessage}</p>
                            <button class="btn btn-sm btn-primary mt-2" onclick="location.reload()">
                                <i class="fas fa-sync-alt me-1"></i> Try Again
                            </button>
                        </div>
                    `;
                });
        } else {
            alert('Your browser does not support camera access.');
            loadingIndicator.classList.add('d-none');
        }
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
        toggleCameraBtn.innerHTML = '<i class="fas fa-video me-1"></i> Start Camera';
        toggleCameraBtn.classList.remove('btn-danger');
        toggleCameraBtn.classList.add('btn-primary');
        
        // Clear the canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Hide alerts
        calibrationAlert.classList.add('d-none');
        loadingIndicator.classList.add('d-none');
    }

    function restartCamera() {
        if (isStreaming) {
            stopCamera();
            setTimeout(() => {
                startCamera();
            }, 500);
        }
    }

    function sendFrame() {
        if (!isStreaming) return;
        
        // Draw the current video frame to the canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get the canvas data as a base64 image with reduced quality for faster transmission
        const imageData = canvas.toDataURL('image/jpeg', 0.5);
        
        // Send the image to the server
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
        translationData.push({
            text,
            timestamp,
            confidence
        });
        
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
            
            // Add speak button
            const speakButton = document.createElement('button');
            speakButton.className = 'btn btn-sm btn-outline-primary';
            speakButton.innerHTML = '<i class="fas fa-volume-up"></i>';
            speakButton.addEventListener('click', () => {
                speakText(entry.text);
            });
            historyItem.appendChild(speakButton);
            
            translationHistory.appendChild(historyItem);
        });
        
        // Scroll to bottom
        translationHistory.scrollTop = translationHistory.scrollHeight;
    }
    
    function exportTranslations() {
        socket.emit('export_translations');
    }
    
    function initializePhraseList() {
        renderPhraseList();
    }
    
    function renderPhraseList(searchTerm = '') {
        // Clear containers
        basicPhrasesContainer.innerHTML = '';
        intermediatePhrasesContainer.innerHTML = '';
        advancedPhrasesContainer.innerHTML = '';
        
        // Filter and render phrases
        let basicCount = 0;
        let intermediateCount = 0;
        let advancedCount = 0;
        
        Object.entries(aslPhrases).forEach(([key, phrase]) => {
            if (searchTerm && !phrase.toLowerCase().includes(searchTerm)) {
                return;
            }
            
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
        
        // Update counts in tabs
        document.querySelector('#basic-tab .badge').textContent = basicCount;
        document.querySelector('#intermediate-tab .badge').textContent = intermediateCount;
        document.querySelector('#advanced-tab .badge').textContent = advancedCount;
    }
    
    function showPhraseDetail(key, phrase, complexity) {
        const phraseDetailText = document.getElementById('phraseDetailText');
        const phraseComplexity = document.getElementById('phraseComplexity');
        
        phraseDetailText.textContent = `To sign "${phrase}", make the "${key.replace(/_/g, ' ')}" gesture.`;
        currentPhrase = phrase;
        
        // Set complexity badge
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