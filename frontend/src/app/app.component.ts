import { Component } from '@angular/core';
import { ApiService } from './services/api.service';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html'
})
export class AppComponent {

  selectedFile!: File;
  resultUrl?: string;

  constructor(private api: ApiService) {}

  onFileChange(event: any) {
    this.selectedFile = event.target.files[0];
  }

  upload() {
    if (!this.selectedFile) return;

    this.api.uploadImage(this.selectedFile).subscribe((res) => {
      this.resultUrl = URL.createObjectURL(res);
    });
  }
}
