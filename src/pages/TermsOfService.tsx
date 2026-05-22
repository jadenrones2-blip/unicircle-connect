import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoImage from '@/assets/unicircle-logo-new.png';

export default function TermsOfService() {
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
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 6, 2025</p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            {/* Important Disclaimer */}
            <section className="bg-gold/10 border border-gold/20 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mt-0 mb-3">
                Important Disclaimer
              </h2>
              <p className="text-foreground/90 mb-0">
                <strong>
                  UniCircle is an independent platform and is not affiliated with, endorsed by,
                  sponsored by, or in any way officially connected with the University of California
                  San Diego (UC San Diego), the University of California system, or any of their
                  subsidiaries or affiliates.
                </strong>
              </p>
            </section>

            {/* Section 1 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using UniCircle ("the Service," "we," "us," or "our"), you agree to
                be bound by these Terms of Service. If you do not agree to these terms, please do
                not use the Service.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">
                2. No University Affiliation
              </h2>
              <p className="text-muted-foreground">
                UniCircle is a third-party platform created to help students discover campus
                organizations and events. We operate independently and:
              </p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                <li>
                  Are <strong>not affiliated</strong> with UC San Diego or any other university
                </li>
                <li>
                  Are <strong>not endorsed</strong> by UC San Diego or any university administration
                </li>
                <li>
                  Are <strong>not sponsored</strong> by UC San Diego or any university department
                </li>
                <li>
                  Do <strong>not represent</strong> UC San Diego or speak on its behalf
                </li>
                <li>
                  Have <strong>no official partnership</strong> with UC San Diego or its student
                  organizations
                </li>
              </ul>
              <p className="text-muted-foreground">
                Any reference to "UC San Diego," "UCSD," or related terms is purely for the purpose
                of identifying the geographic and institutional context in which our users operate.
                The use of "@ucsd.edu" email addresses for verification is a functional requirement
                to confirm student status and does not imply any endorsement or affiliation.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">3. Trademark Notice</h2>
              <p className="text-muted-foreground">
                "University of California," "UC San Diego," "UCSD," and related names, logos, and
                marks are trademarks of The Regents of the University of California. UniCircle does
                not claim any ownership or rights to these trademarks. All university trademarks
                remain the property of their respective owners.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">4. Description of Service</h2>
              <p className="text-muted-foreground">
                UniCircle provides a platform that aggregates publicly available information about
                student organizations and campus events. The Service includes:
              </p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                <li>A directory of student clubs and organizations</li>
                <li>A calendar of campus events</li>
                <li>Tools for club administrators to manage their organization's presence</li>
                <li>Personalized recommendations based on user interests</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">5. User Accounts</h2>
              <p className="text-muted-foreground">
                To access certain features, you must create an account. You agree to:
              </p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">
                6. Club Administrator Responsibilities
              </h2>
              <p className="text-muted-foreground">
                If you claim administrative access to a club or organization page, you represent
                that:
              </p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                <li>You are authorized to represent the organization</li>
                <li>Information you provide is accurate and up-to-date</li>
                <li>You will not misrepresent your organization or its activities</li>
                <li>You will comply with your organization's and university's policies</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">7. Content and Information</h2>
              <p className="text-muted-foreground">
                Information displayed on UniCircle is provided for informational purposes only. We
                make no guarantees about the accuracy, completeness, or timeliness of any
                information. Users should verify event details, meeting times, and other information
                directly with the relevant organizations.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">8. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                UniCircle is provided "as is" without warranties of any kind. We are not liable for:
              </p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                <li>Inaccurate or outdated information about clubs or events</li>
                <li>Actions taken by clubs, organizations, or other users</li>
                <li>Any damages arising from your use of the Service</li>
                <li>Third-party content or links</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">9. Privacy</h2>
              <p className="text-muted-foreground">
                Your privacy is important to us. By using UniCircle, you consent to the collection
                and use of information as described in our Privacy Policy. We do not sell your
                personal information to third parties.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">
                10. Modifications to Service
              </h2>
              <p className="text-muted-foreground">
                We reserve the right to modify, suspend, or discontinue the Service at any time
                without notice. We may also update these Terms of Service periodically. Continued
                use of the Service after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">11. Termination</h2>
              <p className="text-muted-foreground">
                We may terminate or suspend your account at our discretion, without prior notice,
                for conduct that we believe violates these Terms or is harmful to other users, us,
                or third parties.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">12. Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms shall be governed by and construed in accordance with the laws of the
                State of California, without regard to its conflict of law provisions.
              </p>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground">13. Contact</h2>
              <p className="text-muted-foreground">
                If you have questions about these Terms of Service, please contact us through the
                platform.
              </p>
            </section>

            {/* Final disclaimer */}
            <section className="border-t border-border pt-8 mt-8">
              <p className="text-sm text-muted-foreground/70">
                By using UniCircle, you acknowledge that you have read, understood, and agree to be
                bound by these Terms of Service. You also acknowledge that UniCircle is an
                independent platform with no official affiliation to UC San Diego or any other
                educational institution.
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
