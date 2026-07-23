import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

type LegalDocumentKey = 'privacy' | 'terms' | 'cookies';

interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

interface LegalDocument {
  eyebrow: string;
  title: string;
  summary: string;
  updated: string;
  sections: LegalSection[];
}

const DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  privacy: {
    eyebrow: 'Your data',
    title: 'Privacy Policy',
    summary: 'How NovaFit collects, uses, protects, and gives you control over your personal and fitness information.',
    updated: 'July 23, 2026',
    sections: [
      {
        id: 'information',
        title: '1. Information we collect',
        paragraphs: ['We collect information you provide when creating and using a NovaFit account.'],
        bullets: [
          'Account details such as your name, email address, password hash, profile image, and preferences.',
          'Fitness information you choose to log, including workouts, meals, goals, steps, hydration, weight, and progress entries.',
          'Content and interactions you publish in NovaFit Social, including posts, comments, likes, follows, saved posts, and messages.',
          'Technical data required to operate and secure the service, such as device type, browser information, IP address, and diagnostic logs.',
        ],
      },
      {
        id: 'use',
        title: '2. How we use information',
        paragraphs: ['We use your information to provide and improve NovaFit, including to:'],
        bullets: [
          'Authenticate your account and keep it secure.',
          'Calculate personal fitness metrics and display your progress.',
          'Provide AI-assisted meal analysis and fitness guidance when you request it.',
          'Operate social, messaging, notification, and content features.',
          'Diagnose technical issues, prevent abuse, and improve performance.',
        ],
      },
      {
        id: 'visibility',
        title: '3. Public and private information',
        paragraphs: [
          'Your private Progress data, including weight, calorie balance, nutrition, hydration, and health-related entries, is not displayed to other users.',
          'Profile information and content you intentionally publish through social features may be visible to other NovaFit users. Public profile statistics are limited to non-sensitive activity summaries.',
        ],
      },
      {
        id: 'ai',
        title: '4. AI features',
        paragraphs: [
          'When you use an AI feature, the content needed to answer your request may be sent to an AI service provider. We limit this data to what is required for the selected feature.',
          'AI results are informational and are not a substitute for professional medical, nutritional, or training advice.',
        ],
      },
      {
        id: 'sharing',
        title: '5. Sharing and service providers',
        paragraphs: [
          'We do not sell your personal information. We may share limited information with infrastructure, storage, analytics, security, or AI providers that help operate NovaFit. These providers may only process data for the contracted service.',
          'We may disclose information where required by law or when necessary to protect users, NovaFit, or the public.',
        ],
      },
      {
        id: 'retention',
        title: '6. Retention and security',
        paragraphs: [
          'We retain information while your account is active and as reasonably needed to provide the service, meet legal obligations, resolve disputes, and prevent abuse.',
          'We use access controls, encrypted connections, password hashing, and operational safeguards. No online service can guarantee absolute security.',
        ],
      },
      {
        id: 'rights',
        title: '7. Your choices and rights',
        paragraphs: ['Depending on your location, you may have the right to access, correct, export, restrict, object to, or delete your personal information. You can update much of your information from Account settings or contact us for assistance.'],
      },
      {
        id: 'contact',
        title: '8. Contact',
        paragraphs: ['For privacy questions or requests, contact NovaFit at support@novafit.app.'],
      },
    ],
  },
  terms: {
    eyebrow: 'Using NovaFit',
    title: 'Terms of Service',
    summary: 'The rules that keep NovaFit useful, safe, and fair for everyone.',
    updated: 'July 23, 2026',
    sections: [
      {
        id: 'agreement',
        title: '1. Agreement to these terms',
        paragraphs: ['By creating an account or using NovaFit, you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the service.'],
      },
      {
        id: 'eligibility',
        title: '2. Eligibility and accounts',
        paragraphs: ['You must be legally able to enter this agreement in your country. You are responsible for accurate account information, safeguarding your credentials, and all activity performed through your account.'],
      },
      {
        id: 'wellness',
        title: '3. Fitness and wellness disclaimer',
        paragraphs: [
          'NovaFit provides tracking tools and general informational guidance. It does not provide medical diagnosis, treatment, or emergency services.',
          'Consult a qualified professional before changing your exercise or nutrition routine, particularly if you have a medical condition, injury, pregnancy, or other health concern. Stop activity and seek appropriate help if you experience pain or concerning symptoms.',
        ],
      },
      {
        id: 'ai',
        title: '4. AI-generated content',
        paragraphs: ['AI output may be incomplete or inaccurate. You remain responsible for evaluating recommendations, food estimates, workout suggestions, and any decision you make based on them.'],
      },
      {
        id: 'conduct',
        title: '5. Acceptable use',
        paragraphs: ['You may not:'],
        bullets: [
          'Harass, threaten, impersonate, exploit, or harm another person.',
          'Publish illegal, deceptive, hateful, sexually exploitative, or rights-infringing content.',
          'Attempt to bypass security, access another account, scrape the service, distribute malware, or disrupt NovaFit.',
          'Use NovaFit to provide unauthorized medical services or misrepresent AI output as professional advice.',
        ],
      },
      {
        id: 'content',
        title: '6. Your content',
        paragraphs: [
          'You keep ownership of content you create. You grant NovaFit a limited license to host, process, display, and distribute that content only as needed to operate the features you choose to use.',
          'You are responsible for having the rights to content you upload and may remove your content using available controls.',
        ],
      },
      {
        id: 'availability',
        title: '7. Service changes and availability',
        paragraphs: ['We may improve, modify, suspend, or discontinue features. We aim for reliable service but do not guarantee uninterrupted or error-free availability.'],
      },
      {
        id: 'termination',
        title: '8. Suspension and termination',
        paragraphs: ['You may stop using NovaFit at any time. We may restrict or terminate access when these terms are violated, when required by law, or when necessary to protect the service or its users.'],
      },
      {
        id: 'liability',
        title: '9. Liability',
        paragraphs: ['To the maximum extent permitted by law, NovaFit is provided “as is.” NovaFit is not responsible for indirect or consequential losses, injuries resulting from user-selected activities, or decisions based on informational or AI-generated content.'],
      },
      {
        id: 'contact',
        title: '10. Contact',
        paragraphs: ['Questions about these terms can be sent to support@novafit.app.'],
      },
    ],
  },
  cookies: {
    eyebrow: 'Browser storage',
    title: 'Cookie Policy',
    summary: 'What NovaFit stores in your browser, why it is needed, and the choices available to you.',
    updated: 'July 23, 2026',
    sections: [
      {
        id: 'what',
        title: '1. What cookies are',
        paragraphs: ['Cookies and similar browser storage technologies are small pieces of data used to remember information between visits. This policy covers cookies, local storage, and equivalent technologies used by NovaFit.'],
      },
      {
        id: 'essential',
        title: '2. Essential storage',
        paragraphs: ['NovaFit uses essential storage to:'],
        bullets: [
          'Keep you signed in and protect authenticated requests.',
          'Remember security and session information.',
          'Preserve necessary interface and consent preferences.',
          'Maintain reliable navigation and application state.',
        ],
      },
      {
        id: 'analytics',
        title: '3. Analytics and performance',
        paragraphs: ['Where enabled, limited analytics may help us understand feature usage, performance, and errors. We aim to use aggregated or minimized data and do not use analytics to expose private fitness records.'],
      },
      {
        id: 'third-party',
        title: '4. Third-party services',
        paragraphs: ['Features provided by infrastructure, media, analytics, or AI partners may use their own technical storage when necessary to deliver a requested function. Their processing is governed by their respective policies and our service agreements.'],
      },
      {
        id: 'choices',
        title: '5. Your choices',
        paragraphs: [
          'You can control or delete browser storage through your browser settings. Blocking essential storage may prevent login, saved preferences, or parts of NovaFit from working correctly.',
          'If optional analytics or marketing storage is introduced, NovaFit will provide appropriate consent controls before activating it where required.',
        ],
      },
      {
        id: 'updates',
        title: '6. Updates and contact',
        paragraphs: ['We may update this policy when browser technology or our practices change. Questions can be sent to support@novafit.app.'],
      },
    ],
  },
};

@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './legal-page.component.html',
  styleUrl: './legal-page.component.css',
})
export class LegalPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  document: LegalDocument = DOCUMENTS.privacy;

  ngOnInit(): void {
    const key = this.route.snapshot.data['document'] as LegalDocumentKey;
    this.document = DOCUMENTS[key] ?? DOCUMENTS.privacy;
  }

  scrollToSection(sectionId: string): void {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}
