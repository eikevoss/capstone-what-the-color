import { Component, ElementRef, NgZone, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ApiService } from './services/api.service';
import { CommonModule } from '@angular/common';
import { from } from 'rxjs';
import { concatMap, toArray } from 'rxjs/operators';

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

  selectedFiles: File[] = [];
  previewUrls: string[] = [];
  resultUrls: string[] = [];
  currentIndex = 0;

  isBatch = false;
  isLoading = false;
  error?: string;
  isDragging = false;
  isDraggingSlider = false;
  sliderPos = 50;
  loadingPhase = 0;
  loadingPhaseText = 'Uploading…';
  loadingProgress = 0;
  blobBackground = '#080810';
  blobPalette: string[] = ['#7c6ef5', '#2a4ccc', '#8ab0f0', '#0d5c5c', '#c8a0d0'];
  private phaseTimer?: any;
  private progressTimer?: any;
  private loadingProgressRaw = 0;

  constructor(
    private api: ApiService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  onFileChange(event: any) {
    const files: File[] = Array.from(event.target.files);
    console.log('📂 files selected:', files.length);
    if (files.length) this.processFiles(files);
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
    const files: File[] = Array.from(event.dataTransfer?.files ?? []);
    console.log('📂 files dropped:', files.length);
    if (files.length) this.processFiles(files);
  }

  processFiles(files: File[]) {
    this.pickRandomPalette();
    this.isBatch = files.length > 1;
    this.selectedFiles = files;
    this.selectedFile = files[0];
    this.resultUrl = undefined;
    this.resultUrls = [];
    this.previewUrls = [];
    this.currentIndex = 0;
    this.error = undefined;
    this.sliderPos = 50;

    console.log('⚙️ processFiles isBatch:', this.isBatch);

    let loaded = 0;
    files.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrls[i] = e.target?.result as string;
        loaded++;
        if (loaded === files.length) {
          this.zone.run(() => {
            this.previewUrl = this.previewUrls[0];
            this.isLoading = true;
            this.startLoadingPhases();
            this.cdr.detectChanges();
            console.log('🚀 starting upload, isBatch:', this.isBatch, 'previewUrl set:', !!this.previewUrl);
            if (this.isBatch) {
              this.uploadBatch();
            } else {
              this.uploadSingle();
            }
          });
        }
      };
      reader.readAsDataURL(file);
    });
  }

  uploadSingle() {
    console.log('📤 uploadSingle started');
    this.api.uploadImage(this.selectedFiles[0]).subscribe({
      next: (res) => {
        console.log('✅ uploadSingle success');
        this.zone.run(() => {
          this.resultUrl = URL.createObjectURL(res);
          this.stopLoadingPhases(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        });
      },
      error: (err: unknown) => {
        console.error('❌ uploadSingle error', err);
        this.zone.run(() => {
          this.stopLoadingPhases(() => {
            this.error = 'Colorization failed. Please try again.';
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        });
      }
    });
  }

  uploadBatch() {
    console.log('📤 uploadBatch started, files:', this.selectedFiles.length);
    from(this.selectedFiles).pipe(
      concatMap(f => this.api.uploadImage(f)),
      toArray()
    ).subscribe({
      next: (blobs) => {
        console.log('✅ uploadBatch success, blobs:', blobs.length);
        this.zone.run(() => {
          this.resultUrls = blobs.map((b: Blob) => URL.createObjectURL(b));
          this.resultUrl = this.resultUrls[0];
          this.currentIndex = 0;
          this.sliderPos = 50;
          this.stopLoadingPhases(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        });
      },
      error: (err: unknown) => {
        console.error('❌ uploadBatch error', err);
        this.zone.run(() => {
          this.stopLoadingPhases(() => {
            this.error = 'Colorization failed. Please try again.';
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        });
      }
    });
  }

  get currentPreviewUrl(): string {
    return this.previewUrls[this.currentIndex] ?? '';
  }

  get currentResultUrl(): string {
    return this.resultUrls[this.currentIndex] ?? '';
  }

  prevImage() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.sliderPos = 50;
    }
  }

  nextImage() {
    if (this.currentIndex < this.resultUrls.length - 1) {
      this.currentIndex++;
      this.sliderPos = 50;
    }
  }

  downloadCurrent() {
    const a = document.createElement('a');
    a.href = this.currentResultUrl;
    a.download = `colorlab_${this.currentIndex + 1}.jpg`;
    a.click();
  }

  downloadAll() {
    this.resultUrls.forEach((url, i) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `colorlab_${i + 1}.jpg`;
      a.click();
    });
  }

  makeBlobBg(p: number): string {
    const rise = p / 100;
    const b1y = 150 - rise * 110;
    const b2y = 140 - rise * 100;
    const b3y = 135 - rise * 95;
    const b4y = 160 - rise * 120;
    const b5y = 145 - rise * 95;
    const b6y = 155 - rise * 105;
    const s1 = 60 + rise * 55;
    const s2 = 55 + rise * 50;
    const s3 = 50 + rise * 45;
    const s4 = 45 + rise * 40;
    const s5 = 65 + rise * 50;
    const s6 = 70 + rise * 55;
    const alpha = Math.min(0.45 + rise * 0.55, 1);
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    const [c1, c2, c3, c4, c5] = this.blobPalette;
    return `
      radial-gradient(ellipse ${s6}% ${s6}% at 45% ${b6y}%, ${c1}${a}, transparent 62%),
      radial-gradient(ellipse ${s1}% ${s1}% at 15% ${b1y}%, ${c2}${a}, transparent 65%),
      radial-gradient(ellipse ${s2}% ${s2}% at 88% ${b2y}%, ${c3}${a}, transparent 60%),
      radial-gradient(ellipse ${s3}% ${s3}% at 8%  ${b3y}%, ${c4}${a}, transparent 58%),
      radial-gradient(ellipse ${s4}% ${s4}% at 55% ${b4y}%, ${c5}${a}, transparent 55%),
      radial-gradient(ellipse ${s5}% ${s5}% at 72% ${b5y}%, ${c2}${a}, transparent 62%),
      #080810
    `;
  }

  pickRandomPalette() {
    const palettes = [
      // Original — Blue/Purple/Teal/Mauve
      ['#7c6ef5', '#2a4ccc', '#8ab0f0', '#0d5c5c', '#c8a0d0'],
      // Sunset — Red/Orange/Pink/Purple
      ['#e040fb', '#ff4081', '#ff6d00', '#aa00ff', '#f06292'],
      // Aurora — Green/Cyan/Blue/Violet
      ['#00e5ff', '#00bfa5', '#1de9b6', '#651fff', '#40c4ff'],
      // Inferno — Deep Red/Gold/Crimson
      ['#ff1744', '#ff6f00', '#d500f9', '#c62828', '#ff6d00'],
      // Ocean — Navy/Teal/Seafoam/Indigo
      ['#0d47a1', '#006064', '#00897b', '#1565c0', '#4a148c'],
      // Galaxy — Deep Purple/Pink/Cobalt
      ['#6a1b9a', '#ad1457', '#1a237e', '#4527a0', '#880e4f'],
      // Forest — Dark Green/Emerald/Teal/Blue
      ['#1b5e20', '#004d40', '#0d47a1', '#33691e', '#006064'],
    ];
    this.blobPalette = palettes[Math.floor(Math.random() * palettes.length)];
  }

  startLoadingPhases() {
    this.loadingProgressRaw = 0;
    this.loadingProgress = 0;
    this.loadingPhase = 0;
    this.loadingPhaseText = 'Uploading…';

    const phases = [
      { until: 25, text: 'Uploading…' },
      { until: 60, text: 'Analyzing…' },
      { until: 99, text: 'Colorizing…' },
    ];

    this.progressTimer = setInterval(() => {
      const remaining = 99 - this.loadingProgressRaw;
      const increment = remaining * 0.015 + 0.05;
      this.loadingProgressRaw = Math.min(this.loadingProgressRaw + increment, 99);
      this.loadingProgress = Math.round(this.loadingProgressRaw);
      const p = this.loadingProgress;
      const phase = phases.find(ph => p < ph.until) ?? phases[phases.length - 1];
      this.loadingPhaseText = phase.text;
      this.blobBackground = this.makeBlobBg(p);
      this.cdr.detectChanges();
    }, 300);
  }

  stopLoadingPhases(onComplete: () => void) {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = undefined;
    }
    if (this.phaseTimer) {
      clearInterval(this.phaseTimer);
      this.phaseTimer = undefined;
    }
    this.loadingPhaseText = 'Colorizing…';

    // Animate current progress → 100, then call onComplete
    const finishTimer = setInterval(() => {
      this.loadingProgress = Math.min(this.loadingProgress + 2, 100);
      this.blobBackground = this.makeBlobBg(this.loadingProgress);
      this.cdr.detectChanges();
      if (this.loadingProgress >= 100) {
        clearInterval(finishTimer);
        setTimeout(() => onComplete(), 300);
      }
    }, 40);
  }

  onSliderMove(event: MouseEvent) {
    if (!this.isDraggingSlider) return;
    this.updateSlider(event.clientX);
  }

  onSliderTouch(event: TouchEvent) {
    event.preventDefault();
    this.updateSlider(event.touches[0].clientX);
  }

  onImageLoad() {
    setTimeout(() => {
      const container = this.sliderContainer?.nativeElement;
      if (!container) return;
      const img = container.querySelector('img') as HTMLImageElement;
      if (img && img.naturalWidth && img.naturalHeight) {
        container.style.setProperty('--img-aspect', `${img.naturalWidth}/${img.naturalHeight}`);
      }
      const bounds = this.getImageBounds();
      if (bounds) {
        const rect = container.getBoundingClientRect();
        const offsetTopPx = Math.round(bounds.top - rect.top);
        const offsetTopPct = ((bounds.top - rect.top) / rect.height) * 100;
        const offsetBottomPct = ((rect.bottom - bounds.bottom) / rect.height) * 100;
        const offsetLeftPx = Math.round(bounds.left - rect.left) + 16;
        container.style.setProperty('--img-top', offsetTopPct + '%');
        container.style.setProperty('--img-top-px', offsetTopPx + 'px');
        container.style.setProperty('--img-bottom', offsetBottomPct + '%');
        container.style.setProperty('--img-offset-left', offsetLeftPx + 'px');
      }
    }, 50);
  }

  getImageBounds(): { left: number, right: number, top: number, bottom: number, width: number, height: number } | null {
    const container = this.sliderContainer?.nativeElement;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const img = container.querySelector('img') as HTMLImageElement;
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;

    const containerRatio = rect.width / rect.height;
    const imgRatio = img.naturalWidth / img.naturalHeight;

    let imgW: number, imgH: number, offsetLeft: number, offsetTop: number;

    if (imgRatio > containerRatio) {
      imgW = rect.width;
      imgH = rect.width / imgRatio;
      offsetLeft = 0;
      offsetTop = (rect.height - imgH) / 2;
    } else {
      imgH = rect.height;
      imgW = rect.height * imgRatio;
      offsetLeft = (rect.width - imgW) / 2;
      offsetTop = 0;
    }

    return {
      left: rect.left + offsetLeft,
      right: rect.left + offsetLeft + imgW,
      top: rect.top + offsetTop,
      bottom: rect.top + offsetTop + imgH,
      width: imgW,
      height: imgH
    };
  }

  updateSlider(clientX: number) {
    const container = this.sliderContainer.nativeElement;
    const rect = container.getBoundingClientRect();
    const bounds = this.getImageBounds();

    if (bounds) {
      const clampedX = Math.min(Math.max(clientX, bounds.left), bounds.right);
      this.sliderPos = ((clampedX - rect.left) / rect.width) * 100;

      // set CSS vars for handle top/bottom to match image bounds
      const offsetTopPct = ((bounds.top - rect.top) / rect.height) * 100;
      const offsetBottomPct = ((rect.bottom - bounds.bottom) / rect.height) * 100;
      container.style.setProperty('--img-top', offsetTopPct + '%');
      container.style.setProperty('--img-bottom', offsetBottomPct + '%');
    } else {
      const pos = ((clientX - rect.left) / rect.width) * 100;
      this.sliderPos = Math.min(Math.max(pos, 0), 100);
    }
  }

  reset() {
    this.previewUrl = undefined;
    this.resultUrl = undefined;
    this.previewUrls = [];
    this.resultUrls = [];
    this.selectedFile = undefined!;
    this.selectedFiles = [];
    this.isBatch = false;
    this.currentIndex = 0;
    this.error = undefined;
    this.sliderPos = 50;
    this.loadingPhase = 0;
    this.loadingPhaseText = 'Uploading…';
    this.loadingProgress = 0;
    this.blobBackground = '#080810';
  }
}