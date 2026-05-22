import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoImage from '@/assets/unicircle-logo-new.png';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-5 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImage} alt="UniCircle" className="h-8" />
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-5 sm:px-6 py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 6, 2025</p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            {/* Important Disclaimer */}
            <section className="bg-gold/10 border border-gold/20 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mt-0 mb-3">Important Notice</h2>
              <p className="text-foreground/90 mb-0">
                UniCircle is an independent platform and is not affiliated with UC San Diego or any
                university. Your data is handled solely by UniCircle and is not shared with any
                educational institution.
              </p>
            </section>

            {/* Section 1 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
              <p className="text-muted-foreground">
                We collect information you provide directly to us:
              </p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                <li>
                  <strong>Account Information:</strong> Email address and password when you create
                  an account
                </li>
                <li>
                  <strong>Profile Information:</strong> Interests, preferences, and other
                  information you choose to provide
                </li>
                <li>
                  <strong>Club Information:</strong> If you're a club administrator, information
                  about your organization
                </li>
                <li>
                  <strong>Usage Data:</strong> How you interact with our Service
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">
                2. How We Use Your Information
              </h2>
              <p className="text-muted-foreground">We use the information we collect to:</p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                <li>Provide, maintain, and improve our Service</li>
                <li>Personalize your experience with club and event recommendations</li>
                <li>Verify your student status using your .edu email address</li>
                <li>Communicate with you about the Service</li>
                <li>Protect against fraud and abuse</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">3. Information Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell your personal information. We may share information in limited
                circumstances:
              </p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                <li>
                  <strong>With your consent:</strong> When you explicitly agree to share information
                </li>
                <li>
                  <strong>Service providers:</strong> Third parties that help us operate the Service
                </li>
                <li>
                  <strong>Legal requirements:</strong> When required by law or to protect rights
                </li>
              </ul>
              <p className="text-muted-foreground">
                <strong>
                  We do not share your information with UC San Diego or any university.
                </strong>
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate security measures to protect your information. However, no
                method of transmission over the Internet is 100% secure, and we cannot guarantee
                absolute security.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">5. Your Rights</h2>
              <p className="text-muted-foreground">You have the right to:</p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and associated data</li>
                <li>Opt out of promotional communications</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">6. Cookies and Tracking</h2>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to improve your experience, analyze usage,
                and remember your preferences. You can control cookies through your browser
                settings.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">7. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Our Service is not intended for users under 13 years of age. We do not knowingly
                collect information from children under 13.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">8. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy periodically. We will notify you of significant
                changes by posting the new policy on this page with an updated date.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">9. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy, please contact us through the
                platform.
              </p>
            </section>

            {/* Final note */}
            <section className="border-t border-border pt-8 mt-8">
              <p className="text-sm text-muted-foreground/70">
                By using UniCircle, you consent to the collection and use of information in
                accordance with this Privacy Policy.
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-5 sm:px-6 text-center">
          <p className="text-sm text-muted-foreground/60">© 2025 UniCircle. All rights reserved.</p>
          <p className="text-xs text-muted-foreground/50 mt-2">
            UniCircle is not affiliated with, endorsed by, or sponsored by UC San Diego.
          </p>
        </div>
      </footer>
    </div>
  );
}
