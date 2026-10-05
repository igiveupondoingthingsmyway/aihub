export type Category =
  | "AI Chat" | "Image Generation" | "Video" | "Coding"
  | "Writing" | "Research" | "Audio" | "Productivity";

export type Pricing = "Free" | "Freemium" | "Paid";

export interface Plan { name: string; price: string }

export interface AITool {
  slug: string;
  name: string;
  company: string;
  description: string;
  categories: Category[]; // first entry is the primary category
  pricing: Pricing;
  plans: Plan[];
  features: string[];
  url: string;
  color: string; // 6-digit hex, used for the monogram logo
  featured?: boolean;
}
