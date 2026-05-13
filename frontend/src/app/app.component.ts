import { Component, ElementRef, NgZone, ViewChild } from '@angular/core';
import { ApiService } from './services/api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  @ViewChild('sliderContainer') sliderContainer!: ElementRef;

  selectedFile!: File;
  previewUrl?: string;
  resultUrl?: string;
  isLoading = false;
  error?: string;
  isDragging = false;
  isDraggingSlider = false;
  sliderPos = 50;
  loadingPhase = 0;
  loadingPhaseText = 'Uploading...';
  private phaseTimer?: any;

  constructor(private api: ApiService, private zone: NgZone) {}

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave() {
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  processFile(file: File) {
    this.selectedFile = file;
    this.resultUrl = undefined;
    this.error = undefined;
    this.sliderPos = 50;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.zone.run(() => {
        this.previewUrl = e.target?.result as string;
        this.isLoading = true;
        this.startLoadingPhases();
        this.upload();
      });
    };
    reader.readAsDataURL(file);
  }

  upload() {
    this.api.uploadImage(this.selectedFile).subscribe({
      next: (res) => {
        console.log('✅ upload success', res);
        this.zone.run(() => {
          this.stopLoadingPhases();
          this.resultUrl = URL.createObjectURL(res);
          this.isLoading = false;
          console.log('✅ resultUrl set', this.resultUrl);
        });
      },
      error: (err) => {
        console.error('❌ upload error', err);
        this.zone.run(() => {
          this.stopLoadingPhases();
          this.error = 'Colorization failed. Please try again.';
          this.isLoading = false;
        });
      }
    });
  }

  startLoadingPhases() {
    const phases = [
      { text: 'Uploading...', phase: 0 },
      { text: 'Analyzing image...', phase: 1 },
      { text: 'Colorizing your photo...', phase: 2 },
    ];
    let i = 0;
    this.loadingPhase = 0;
    this.loadingPhaseText = phases[0].text;
    this.phaseTimer = setInterval(() => {
      if (i < phases.length - 1) {
        i++;
        this.loadingPhase = phases[i].phase;
        this.loadingPhaseText = phases[i].text;
      } else {
        clearInterval(this.phaseTimer);
      }
    }, 2200);
  }

  stopLoadingPhases() {
    if (this.phaseTimer) {
      clearInterval(this.phaseTimer);
      this.phaseTimer = undefined;
    }
    this.loadingPhase = 0;
    this.loadingPhaseText = 'Uploading...';
  }

  onSliderMove(event: MouseEvent) {
    if (!this.isDraggingSlider) return;
    this.updateSlider(event.clientX);
  }

  onSliderTouch(event: TouchEvent) {
    event.preventDefault();
    this.updateSlider(event.touches[0].clientX);
  }

  updateSlider(clientX: number) {
    const rect = this.sliderContainer.nativeElement.getBoundingClientRect();
    const pos = ((clientX - rect.left) / rect.width) * 100;
    this.sliderPos = Math.min(Math.max(pos, 0), 100);
  }

  reset() {
    this.previewUrl = undefined;
    this.resultUrl = undefined;
    this.selectedFile = undefined!;
    this.error = undefined;
    this.sliderPos = 50;
    this.loadingPhase = 0;
    this.loadingPhaseText = 'Uploading...';
  }
}
