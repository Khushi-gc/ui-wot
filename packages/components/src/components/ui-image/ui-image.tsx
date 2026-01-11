import { Component, Element, Prop, State, Method, h } from '@stencil/core';

interface ImageMetadata {
    format: string;
    width: number;
    height: number;
    size: number;
    lastUpdated: Date;
}

@Component({
    tag: 'ui-image',
    styleUrl: 'ui-image.css',
    shadow: true,
})
export class UiImage {
    @Element() el: HTMLElement;

    // Configuration Props
    @Prop() label: string = 'CameraSnapshot';
    @Prop() canRead: boolean = false;
    @Prop() canWrite: boolean = false;
    @Prop() canObserve: boolean = false;
    @Prop() acceptedFormats: string = 'image/*';
    @Prop() maxFileSize: number = 5 * 1024 * 1024;

    @Prop() height: string = '240px';
    @Prop() showLastUpdated: boolean = true;
    @Prop() showStatus: boolean = true;

    @Prop() dark: boolean = false;

    // Internal State
    @State() isObserving: boolean = false;
    @State() selectedFile: File | null = null;
    @State() currentImageUrl: string | null = null;
    @State() metadata: ImageMetadata | null = null;

    @State() loading: boolean = false;
    @State() statusText: string = 'No data received yet';
    @State() statusType: 'neutral' | 'success' | 'error' = 'neutral';

    // Stored operations
    // private storedReadOperation?: () => Promise<string>;
    private storedWriteOperation?: (file: File) => Promise<void>;
    // private storedObserveOperation?: (next: (data: string) => void) => Promise<() => void>;

    private fileInput: HTMLInputElement;


    componentDidLoad() {
        // Disabled auto-load to prevent showing image before selection
        // this.attemptAutoLoad();
    }

    @Method()
    async setValue(
        _value: any,
        options?: {
            readOperation?: () => Promise<string>;
            writeOperation?: (file: File) => Promise<void>;
            observeOperation?: (next: (data: string) => void) => Promise<() => void>;
        }
    ) {
        // if (options?.readOperation) this.storedReadOperation = options.readOperation;
        if (options?.writeOperation) this.storedWriteOperation = options.writeOperation;
        // if (options?.observeOperation) this.storedObserveOperation = options.observeOperation;

        // Disabled auto-load
    }

    // Logic Handlers

    private handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        this.selectedFile = file;

        // Stop observing if we select a file
        if (this.isObserving) {
            this.isObserving = false;
            this.updateStatus("Live stopped for selection", 'neutral');
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                // Ensure the result is treated as a string for currentImageUrl.
                // TypeScript might infer string | ArrayBuffer, forcing conversion.
                this.currentImageUrl = e.target.result as string;
            }
            this.updateStatus("Displaying", 'neutral');
        };
        reader.readAsDataURL(file);
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    private async handleSend() {
        if (!this.selectedFile || !this.storedWriteOperation) return;
        this.loading = true;
        this.updateStatus("Sending...", 'neutral');
        try {
            await this.storedWriteOperation(this.selectedFile);
            this.updateStatus("Sent successfully", 'success');
        } catch (e) {
            this.updateStatus("Failed to send", 'error');
        } finally {
            this.loading = false;
        }
    }

    private updateStatus(msg: string, type: 'neutral' | 'success' | 'error') {
        this.statusText = msg;
        this.statusType = type;
        if (type === 'success' || (this.currentImageUrl && type !== 'error')) {
            this.metadata = { ...this.metadata, lastUpdated: new Date() } as any;
        }
    }

    private onImageLoad(event: Event) {
        const img = event.target as HTMLImageElement;
        this.metadata = {
            format: 'IMG',
            width: img.naturalWidth,
            height: img.naturalHeight,
            size: this.selectedFile?.size || 0,
            lastUpdated: new Date()
        };
        this.loading = false;
    }

    private getSubtitle() {
        const parts = [];
        if (this.canRead) parts.push("Read-only");
        if (this.canWrite) parts.push("Writable");
        if (this.canObserve) parts.push("Live");
        return parts.join(" / ") || "Image";
    }

    private getPlaceholderText() {
        if (this.canRead) return "Image Placeholder";
        if (this.canObserve) return "Waiting for connection...";
        return "No image available.";
    }

    render() {
        return (
            <div class="ui-image-card">
                {/* HEADER */}
                <div class="card-header">
                    <span class="header-title">{this.label}</span>
                    <span class="header-subtitle">{this.getSubtitle()}</span>
                </div>

                {/* CONTENT */}
                <div class="card-content" style={{ height: this.height }}>
                    {this.currentImageUrl ? (
                        <div class="image-wrapper">
                            <img
                                src={this.currentImageUrl}
                                onLoad={(e) => this.onImageLoad(e)}
                                onError={() => this.updateStatus("Failed to display image", 'error')}
                            />
                        </div>
                    ) : (
                        <div class="placeholder">
                            <span class="placeholder-icon">🖼️</span>
                            <span class="placeholder-text">{this.getPlaceholderText()}</span>
                        </div>
                    )}

                    {this.loading && <div class="loading-overlay"><div class="spinner"></div></div>}
                </div>

                {/* FILE METADATA ROW */}
                {this.selectedFile && (
                    <div class="file-metadata-row">
                        <span class="file-name" title={this.selectedFile.name}>{this.selectedFile.name}</span>
                        <span class="file-size">{this.formatFileSize(this.selectedFile.size)}</span>
                    </div>
                )}

                {/* CONTROLS (Only visible if write is enabled) */}
                {this.canWrite && (
                    <div class="card-controls">
                        {!this.selectedFile && (
                            <button class="btn-control" onClick={() => this.fileInput?.click()}>
                                Choose File
                            </button>
                        )}

                        {this.selectedFile && (
                            <div class="file-actions">
                                <button class="btn-control primary" onClick={() => this.handleSend()}>
                                    Send
                                </button>
                                <button class="btn-control" onClick={() => { this.selectedFile = null; this.fileInput.value = ''; }}>
                                    Cancel
                                </button>
                            </div>
                        )}
                        {/* Hidden input moved to end of controls block to keep it tidy */}
                        <input
                            type="file"
                            class="hidden"
                            ref={el => this.fileInput = el}
                            onChange={e => this.handleFileSelect(e)}
                            accept={this.acceptedFormats}
                        />
                    </div>
                )}

                {/* STATUS */}
                <div class="card-status">
                    <div class="status-row">
                        <span class="status-label">Status:</span>
                        <span class={{ 'status-value': true, [this.statusType]: true }}>
                            {this.statusType === 'success' && '✔ '}
                            {this.statusType === 'error' && '⚠ '}
                            {this.statusText}
                        </span>
                    </div>

                    <div class="status-row">
                        <span class="status-label">Last update:</span>
                        <span class="status-value">
                            {this.metadata?.lastUpdated ? this.metadata.lastUpdated.toLocaleTimeString() : '—'}
                        </span>
                    </div>
                </div>
            </div>
        );
    }
}
