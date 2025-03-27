class SubtitleDisplay {
  constructor() {
    this.subtitles = [];
    this.currentIndex = -1;
    this.originalElement = null;
    this.translationElement = null;
    this.currentTime = 0;
  }

  initialize(originalElement, translationElement) {
    this.originalElement = originalElement;
    this.translationElement = translationElement;
  }

  loadSubtitles(subtitles) {
    this.subtitles = subtitles;
    this.currentIndex = -1;
  }

  getSubtitles() {
    return this.subtitles;
  }

  getCurrentIndex() {
    return this.currentIndex;
  }

  getSubtitleAtTime(time) {
    this.currentTime = time;
    return this.subtitles.find(subtitle => 
      time >= subtitle.start && time <= subtitle.end
    );
  }

  getCurrentTime() {
    return this.currentTime;
  }

  updateDisplay(time) {
    const subtitle = this.getSubtitleAtTime(time);
    if (!subtitle) {
      this.clearDisplay();
      return;
    }

    this.currentIndex = this.subtitles.indexOf(subtitle);
    this.displaySubtitle(subtitle);
  }

  displaySubtitle(subtitle) {
    if (this.originalElement) {
      this.originalElement.textContent = subtitle.text;
    }
    if (this.translationElement && subtitle.translation) {
      this.translationElement.textContent = subtitle.translation;
    }
  }

  clearDisplay() {
    if (this.originalElement) {
      this.originalElement.textContent = '';
    }
    if (this.translationElement) {
      this.translationElement.textContent = '';
    }
  }

  getCurrentTranslation() {
    if (this.currentIndex >= 0 && this.currentIndex < this.subtitles.length) {
      return this.subtitles[this.currentIndex].translation;
    }
    return '';
  }

  goToNext() {
    if (this.currentIndex < this.subtitles.length - 1) {
      this.currentIndex++;
      this.displaySubtitle(this.subtitles[this.currentIndex]);
    }
  }

  goToPrevious() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.displaySubtitle(this.subtitles[this.currentIndex]);
    }
  }
}

module.exports = { SubtitleDisplay }; 