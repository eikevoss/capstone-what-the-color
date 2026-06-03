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
  loadingPhaseText = 'Uploading...';
  private phaseTimer?: any;

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
          this.stopLoadingPhases();
          this.resultUrl = URL.createObjectURL(res);
          this.isLoading = false;
          console.log('✅ resultUrl set:', !!this.resultUrl, 'previewUrl:', !!this.previewUrl, 'isLoading:', this.isLoading);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('❌ uploadSingle error', err);
        this.zone.run(() => {
          this.stopLoadingPhases();
          this.error = 'Colorization failed. Please try again.';
          this.isLoading = false;
          this.cdr.detectChanges();
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
          this.stopLoadingPhases();
          this.resultUrls = blobs.map(b => URL.createObjectURL(b));
          this.resultUrl = this.resultUrls[0];
          this.isLoading = false;
          this.currentIndex = 0;
          this.sliderPos = 50;
          console.log('✅ resultUrls:', this.resultUrls.length, 'previewUrl:', !!this.previewUrl, 'isBatch:', this.isBatch, 'isLoading:', this.isLoading);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('❌ uploadBatch error', err);
        this.zone.run(() => {
          this.stopLoadingPhases();
          this.error = 'Colorization failed. Please try again.';
          this.isLoading = false;
          this.cdr.detectChanges();
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
        this.cdr.detectChanges();
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
    this.previewUrls = [];
    this.resultUrls = [];
    this.selectedFile = undefined!;
    this.selectedFiles = [];
    this.isBatch = false;
    this.currentIndex = 0;
    this.error = undefined;
    this.sliderPos = 50;
    this.loadingPhase = 0;
    this.loadingPhaseText = 'Uploading...';
  }
}