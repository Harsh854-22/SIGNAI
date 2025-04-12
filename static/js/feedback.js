  let selectedButton = null;

  function selectFeedback(type, buttonId) {
    document.getElementById('feedbackType').value = type;

    // Toggle button styles
    if (selectedButton) {
      selectedButton.classList.remove('btn-primary');
      selectedButton.classList.add('btn-outline-primary');
    }

    const button = document.getElementById(buttonId);
    button.classList.remove('btn-outline-primary');
    button.classList.add('btn-primary');
    selectedButton = button;
  }

  document.getElementById('positiveFeedback').addEventListener('click', function () {
    selectFeedback('Positive', 'positiveFeedback');
  });

  document.getElementById('negativeFeedback').addEventListener('click', function () {
    selectFeedback('Needs Improvement', 'negativeFeedback');
  });