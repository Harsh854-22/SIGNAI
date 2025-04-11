/**
 * ASL Translator Responsive Enhancements
 * Handles dynamic UI adjustments for responsive design
 */

document.addEventListener("DOMContentLoaded", () => {
    // Initialize responsive features
    initResponsiveFeatures()
  
    // Listen for window resize events
    window.addEventListener("resize", debounce(handleResize, 250))
  
    // Initial check
    handleResize()
  })
  
  /**
   * Initialize responsive features
   */
  function initResponsiveFeatures() {
    // Add span elements to buttons for responsive text hiding
    wrapButtonText()
  
    // Initialize horizontal scroll for tabs on mobile
    initTabsScroll()
  
    // Add responsive classes to phrase cards
    initPhraseCards()
  
    // Enhance form controls for mobile
    enhanceFormControls()
  }
  
  /**
   * Wrap button text in spans for responsive hiding
   */
  function wrapButtonText() {
    document.querySelectorAll(".btn").forEach((btn) => {
      // Skip if already processed or only contains an icon
      if (btn.querySelector(".btn-text") || (btn.childNodes.length === 1 && btn.querySelector("i"))) {
        return
      }
  
      // Get all text nodes
      const textNodes = Array.from(btn.childNodes).filter(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "",
      )
  
      // Wrap each text node in a span
      textNodes.forEach((textNode) => {
        const span = document.createElement("span")
        span.className = "btn-text"
        span.textContent = textNode.textContent
        btn.replaceChild(span, textNode)
      })
    })
  }
  
  /**
   * Initialize horizontal scrolling for tabs on mobile
   */
  function initTabsScroll() {
    const tabsContainers = document.querySelectorAll(".nav-tabs")
  
    tabsContainers.forEach((container) => {
      // Add event listeners for touch scrolling
      let isDown = false
      let startX
      let scrollLeft
  
      container.addEventListener("mousedown", (e) => {
        isDown = true
        startX = e.pageX - container.offsetLeft
        scrollLeft = container.scrollLeft
      })
  
      container.addEventListener("mouseleave", () => {
        isDown = false
      })
  
      container.addEventListener("mouseup", () => {
        isDown = false
      })
  
      container.addEventListener("mousemove", (e) => {
        if (!isDown) return
        e.preventDefault()
        const x = e.pageX - container.offsetLeft
        const walk = (x - startX) * 2 // Scroll speed
        container.scrollLeft = scrollLeft - walk
      })
  
      // Ensure active tab is visible
      const makeActiveTabVisible = () => {
        const activeTab = container.querySelector(".nav-link.active")
        if (activeTab) {
          activeTab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
        }
      }
  
      // Listen for tab changes
      container.querySelectorAll(".nav-link").forEach((tab) => {
        tab.addEventListener("shown.bs.tab", makeActiveTabVisible)
      })
  
      // Initial scroll to active tab
      setTimeout(makeActiveTabVisible, 100)
    })
  }
  
  /**
   * Initialize phrase cards for responsive layout
   */
  function initPhraseCards() {
    const phraseContainers = [
      document.getElementById("basicPhrases"),
      document.getElementById("intermediatePhrases"),
      document.getElementById("advancedPhrases"),
    ]
  
    phraseContainers.forEach((container) => {
      if (!container) return
  
      // Add responsive classes to columns
      container.querySelectorAll(".col-md-4").forEach((col) => {
        col.classList.add("col-sm-6")
      })
    })
  }
  
  /**
   * Enhance form controls for mobile
   */
  function enhanceFormControls() {
    // Set appropriate input types for mobile
    document.querySelectorAll("input").forEach((input) => {
      // Ensure numeric inputs use number type
      if (input.id.includes("Range")) {
        input.setAttribute("inputmode", "numeric")
      }
  
      // Ensure email inputs use email type
      if (input.id.includes("Email")) {
        input.setAttribute("inputmode", "email")
      }
  
      // Prevent zoom on iOS by ensuring font size >= 16px
      input.style.fontSize = "16px"
    })
  
    // Enhance select elements
    document.querySelectorAll("select").forEach((select) => {
      select.style.fontSize = "16px"
    })
  }
  
  /**
   * Handle window resize events
   */
  function handleResize() {
    const width = window.innerWidth
  
    // Apply icon-only mode for buttons on small screens
    const iconOnlyMode = width <= 400
    document.body.classList.toggle("icon-only-mode", iconOnlyMode)
  
    // Adjust camera container height based on width
    const cameraContainer = document.getElementById("cameraContainer")
    if (cameraContainer && width <= 768) {
      const aspectRatio = 3 / 4 // 4:3 aspect ratio
      cameraContainer.style.height = `${cameraContainer.offsetWidth * aspectRatio}px`
    } else if (cameraContainer) {
      cameraContainer.style.height = ""
    }
  
    // Adjust translation history height
    const translationHistory = document.getElementById("translationHistory")
    if (translationHistory && width <= 768) {
      translationHistory.style.maxHeight = "150px"
    } else if (translationHistory) {
      translationHistory.style.maxHeight = "300px"
    }
  }
  
  /**
   * Debounce function to limit how often a function can be called
   */
  function debounce(func, wait) {
    let timeout
    return function () {
      
      const args = arguments
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        func.apply(this, args)
      }, wait)
    }
  }
  