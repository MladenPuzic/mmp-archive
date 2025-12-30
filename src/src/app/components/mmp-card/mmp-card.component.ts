import { Component, HostListener, Input, OnChanges, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-mmp-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mmp-card.component.html',
  styleUrls: ['./mmp-card.component.css']
})
export class MmpCardComponent implements OnChanges {
  @Input() mmp: any;
  @Input() people: any[] = [];
  @Input() locations: any[] = [];

  // gallery state: probe for assets by index and known extensions
  media = signal<Array<{url: string; type: 'image'|'video'; thumbnail?: string}>>([]);
  activeIndex = signal(0);

  // helper computed values for template
  hasMedia = computed(() => this.media().length > 0);
  activeMedia = computed(() => this.media()[this.activeIndex()] || null);
  // lightbox
  lightboxOpen = signal(false);

  constructor() {
    // nothing here; probing will run when mmp input is set by Angular lifecycle
  }

  // Called from template when component receives its input
  ngOnChanges() {
    this.probeMedia();
  }

  // synchronous probe: build possible URLs and test by attempting to fetch headers
  async probeMedia() {
    if (!this.mmp || !this.mmp.id) return;
    const found: Array<{url: string; type: 'image'|'video'; thumbnail?: string}> = [];
  // do not use prebuilt media-index files; prefer mmp.media if present
    // If media filenames are declared in the data, use them (filenames only).
    if (Array.isArray(this.mmp.media) && this.mmp.media.length > 0) {
      const urls = this.mmp.media.map((fname: string) => {
        const lower = String(fname).toLowerCase();
        const isVideo = lower.endsWith('.mp4') || lower.endsWith('.webm');
        // Serve from the built `public` folder at img/{id}/{file};
        // fall back to assets/img for environments that expose assets there.
        const url = `img/${this.mmp.id}/${fname}`;
        const fallback = `assets/img/${this.mmp.id}/${fname}`;
        return { url, fallback, type: isVideo ? 'video' : 'image' } as any;
      });
      // normalize to {url,type} but keep fallback in case element fails to load
      // template will attempt to load url; elementExists probing already checks /img and /assets/img in other codepaths.
      const normalized = urls.map((u: any) => ({ url: u.url, type: u.type }));
      this.media.set(normalized);
      this.activeIndex.set(0);
      // Generate thumbnails for videos
      this.generateVideoThumbnails();
      return;
    }
    const exts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm'];
  // probe first up to 12 files using element loading (avoids fetch HEAD 404s in console)
    const maxFiles = 12;
    const maxFound = 8;
  // fallback bases to try when index is not present
  const bases = [`img/${this.mmp.id}`, `assets/img/${this.mmp.id}`];
  for (let i = 1; i <= maxFiles; i++) {
      let foundThisIndex = false;
      for (const ext of exts) {
        for (const base of bases) {
          const url = `${base}/${i}.${ext}`;
          // use element loaders depending on type
          const isVideo = ext === 'mp4' || ext === 'webm';
          try {
            const ok = await this.elementExists(url, isVideo);
            if (ok) {
              found.push({ url, type: isVideo ? 'video' : 'image' });
              foundThisIndex = true;
              break;
            }
          } catch (e) {
            // ignore
          }
        }
        if (foundThisIndex) break;
      }
      if (found.length >= maxFound) break;
    }
    this.media.set(found);
    this.activeIndex.set(0);
    // Generate thumbnails for videos
    this.generateVideoThumbnails();
  }

  // Generate thumbnail from video's first frame
  async generateVideoThumbnails() {
    const currentMedia = this.media();
    const updated = [...currentMedia];
    let changed = false;

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].type === 'video' && !updated[i].thumbnail) {
        try {
          const thumb = await this.captureVideoFrame(updated[i].url);
          if (thumb) {
            updated[i] = { ...updated[i], thumbnail: thumb };
            changed = true;
          }
        } catch (e) {
          // ignore thumbnail generation errors
        }
      }
    }

    if (changed) {
      this.media.set(updated);
    }
  }

  // Capture first frame of video as data URL
  captureVideoFrame(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';

      video.onloadeddata = () => {
        video.currentTime = 0.1; // seek slightly to get a frame
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 120;
          canvas.height = video.videoHeight || 90;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
        video.src = '';
      };

      video.onerror = () => {
        resolve(null);
      };

      // timeout fallback
      setTimeout(() => resolve(null), 5000);

      video.src = url;
    });
  }

  // helper: return Promise that resolves true if image/video loads, false on error
  elementExists(url: string, isVideo = false): Promise<boolean> {
    return new Promise((resolve) => {
      if (isVideo) {
        const v = document.createElement('video');
        v.preload = 'metadata';
        const onCan = () => { cleanup(); resolve(true); };
        const onErr = () => { cleanup(); resolve(false); };
        const cleanup = () => { v.removeEventListener('loadedmetadata', onCan); v.removeEventListener('error', onErr); v.src = ''; };
        v.addEventListener('loadedmetadata', onCan);
        v.addEventListener('error', onErr);
        v.src = url;
      } else {
        const img = new Image();
        img.onload = () => { resolve(true); };
        img.onerror = () => { resolve(false); };
        img.src = url;
      }
    });
  }

  openLightbox() { this.lightboxOpen.set(true); }
  closeLightbox() { this.lightboxOpen.set(false); }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (!this.lightboxOpen()) return;
    
    switch (event.key) {
      case 'Escape':
        this.closeLightbox();
        break;
      case 'ArrowLeft':
        this.prev();
        break;
      case 'ArrowRight':
        this.next();
        break;
    }
  }

  next() {
    if (!this.hasMedia()) return;
    this.activeIndex.set((this.activeIndex() + 1) % this.media().length);
  }

  prev() {
    if (!this.hasMedia()) return;
    this.activeIndex.set((this.activeIndex() - 1 + this.media().length) % this.media().length);
  }

  getHostName() {
    const host = this.people.find((p: any) => p.id === this.mmp.hostId);
    return host ? host.name : 'Unknown';
  }

  getLocationName() {
    const loc = this.locations.find((l: any) => l.id === this.mmp.locationId);
    return loc ? loc.name : 'Unknown';
  }

  getPersonName(userId: number) {
    const p = this.people.find((x: any) => x.id === userId);
    return p ? p.name : ('#' + userId);
  }
}
