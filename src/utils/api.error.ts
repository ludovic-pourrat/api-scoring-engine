export class APIError extends Error {
    public status: number;
    public type: string;
    public title: string;
    public detail?: string;

    constructor(status: number, title: string, detail?: string, type?: string) {
        super(detail || title);
        this.status = status;
        this.type = type || "about:blank";
        this.title = title;
        this.detail = detail;
    }
}
