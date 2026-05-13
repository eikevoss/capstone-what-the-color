import { Component, ElementRef, ViewChild } from '@angular/core';
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

  constructor(private api: ApiService) {}

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
      this.previewUrl = e.target?.result as string;
      this.upload();
    };
    reader.readAsDataURL(file);
  }

  upload() {
    this.isLoading = true;
    this.api.uploadImage(this.selectedFile).subscribe({
      next: (res) => {
        this.resultUrl = URL.createObjectURL(res);
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Colorization failed. Please try again.';
        this.isLoading = false;
      }
    });
  }

  onSliderMove(event: MouseEvent) {
    if (!this.isDraggingSlider) return;
    this.updateSlider(event.clientX);
  }

  onSliderTouch(event: TouchEvent) {
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
  }
}