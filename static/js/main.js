document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const cameraPlaceholder = document.getElementById('cameraPlaceholder');
    const toggleCameraBtn = document.getElementById('toggleCamera');
    const viewPhrasesBtn = document.getElementById('viewPhrases');
    const translationDisplay = document.getElementById('translationDisplay');
    const translationHistory = document.getElementById('translationHistory');
    const confidenceIndicator = document.getElementById('confidenceIndicator');
    const exportBtn = document.getElementById('exportBtn');
    const feedbackBtn = document.getElementById('feedbackBtn');
    const howToUseBtn = document.getElementById('howToUseBtn');
    const calibrationAlert = document.getElementById('calibrationAlert');
    const calibrationIssues = document.getElementById('calibrationIssues');
    const faceModelAlert = document.getElementById('faceModelAlert');
    const phraseSearch = document.getElementById('phraseSearch');
    const basicPhrasesContainer = document.getElementById('basicPhrases');
    const intermediatePhrasesContainer = document.getElementById('intermediatePhrases');
    const advancedPhrasesContainer = document.getElementById('advancedPhrases');
    
    // Bootstrap components
    const phrasesTab = document.getElementById('phrases-tab');
    const translateTab = document.getElementById('translate-tab');
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
    
    // ASL phrases (should match backend)
    const aslPhrases = {
        "thumbs_up": "Yes / Good",
        "open_palm": "Hello",
        "victory": "Peace",
        "pointing_up": "One moment please",
        "fist": "Stop",
        "pinch": "A little bit",
        "ok_sign": "OK",
        "pointing_index": "I / Me",
        "wave": "Goodbye",
        "spread_fingers": "Five / Help"
    };
    
    // Phrase complexity mapping
    const phraseComplexity = {
        "thumbs_up": "basic",
        "open_palm": "basic",
        "victory": "basic",
        "pointing_up": "basic",
        "fist": "basic",
        "pinch": "basic",
        "ok_sign": "basic",
        "pointing_index": "basic",
        "wave": "basic",
        "spread_fingers": "basic"
    };
    
    // Socket events
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('connected', (data) => {
        sessionId = data.session_id;
        console.log('Session ID:', sessionId);
    });
    
    socket.on('processed_frame', (data) => {
        if (!isStreaming) return;
        
        // Update the canvas with the processed frame
        const img = new Image();
        img.onload = () => {
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = data.image;
        
        // Update translation display if there's a translation
        if (data.translation) {
            translationDisplay.textContent = data.translation;
            
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
        
        // Send the next frame
        if (isStreaming) {
            setTimeout(sendFrame, 100); // Limit to ~10 FPS to reduce server load
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
        
        // In a real app, you would send this to your backend
        console.log({
            feedbackType: selectedFeedbackType,
            email,
            feedback
        });
        
        // Show success message
        alert('Thank you for your feedback! It helps us improve the ASL Translator.');
        
        // Reset form and close modal
        selectedFeedbackType = null;
        document.getElementById('feedbackEmail').value = '';
        document.getElementById('feedbackText').value = '';
        document.getElementById('positiveFeedback').classList.add('btn-outline-primary');
        document.getElementById('positiveFeedback').classList.remove('btn-primary');
        document.getElementById('negativeFeedback').classList.add('btn-outline-primary');
        document.getElementById('negativeFeedback').classList.remove('btn-primary');
        feedbackModal.hide();
    });
    
    // Phrase search
    phraseSearch.addEventListener('input', () => {
        const searchTerm = phraseSearch.value.toLowerCase();
        renderPhraseList(searchTerm);
    });
    
    // Initialize
    initializePhraseList();
    
    // Functions
    function toggleCamera() {
        if (isStreaming) {
            stopCamera();
        } else {
            startCamera();
        }
    }
    
    function startCamera() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(function(stream) {
                    video.srcObject = stream;
                    video.play();
                    
                    // Set up canvas dimensions once video metadata is loaded
                    video.addEventListener('loadedmetadata', function() {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        
                        isStreaming = true;
                        cameraPlaceholder.style.display = 'none';
                        toggleCameraBtn.innerHTML = '<i class="fas fa-video-slash"></i> Stop Camera';
                        toggleCameraBtn.classList.remove('btn-primary');
                        toggleCameraBtn.classList.add('btn-danger');
                        
                        // Start sending frames to the server
                        sendFrame();
                    });
                })
                .catch(function(error) {
                    console.error('Error accessing camera:', error);
                    alert('Error accessing camera. Please check your permissions.');
                });
        } else {
            alert('Your browser does not support camera access.');
        }
    }
    
    function stopCamera() {
        if (video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }
        
        isStreaming = false;
        cameraPlaceholder.style.display = 'flex';
        toggleCameraBtn.innerHTML = '<i class="fas fa-video"></i> Start Camera';
        toggleCameraBtn.classList.remove('btn-danger');
        toggleCameraBtn.classList.add('btn-primary');
        
        // Clear the canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Hide alerts
        calibrationAlert.classList.add('d-none');
        faceModelAlert.classList.add('d-none');
    }
    
    function sendFrame() {
        if (!isStreaming) return;
        
        // Draw the current video frame to the canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get the canvas data as a base64 image
        const imageData = canvas.toDataURL('image/jpeg', 0.7);
        
        // Send the image to the server
        socket.emit('frame', { image: imageData });
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
            phraseButton.className = 'col-md-4';
            phraseButton.innerHTML = `
                <button class="btn btn-outline-secondary w-100 phrase-btn" 
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
        
        phraseDetailText.textContent = `To sign "${phrase}", make the "${key.replace('_', ' ')}" gesture.`;
        
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