export interface Issue {
    severity: string;
    code: string | number;
    message: string;
}

export interface Category {
    score: number;
    issues: Issue[];
    category: string;
    key: string;
}

export interface Score {
    title: string;
    version: string;
    score: number;
    categories: Category[];
}
