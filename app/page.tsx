"use client"

import Link from "next/link"
import { Zap, Shield, DollarSign, Upload, Package } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-sm">
                <Package className="w-6 h-6 text-accent-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Compr</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 bg-accent text-accent-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-all shadow-sm"
              >
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-20 pb-16 text-center">
          <h2 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight text-balance">
            <span className="text-foreground">List Once.</span>
            <br />
            <span className="text-accent">Sell Everywhere.</span>
          </h2>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed text-pretty">
            Cross-list your items to eBay, Etsy, Poshmark, Mercari, and Depop with one click. Manage all your listings
            from a single dashboard.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <Link
              href="/signup"
              className="px-8 py-3.5 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-all shadow-md"
            >
              Start Free Trial
            </Link>
            <Link
              href="#pricing"
              className="px-8 py-3.5 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-muted transition-all border border-border"
            >
              View Pricing
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">10 free listings • No credit card required</p>
        </div>

        {/* Feature Highlights */}
        <div className="mb-20 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-8 bg-card border border-border rounded-xl">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">Lightning Fast</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">List to 5 platforms in under 60 seconds</p>
            </div>

            <div className="text-center p-8 bg-card border border-border rounded-xl">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-accent" />
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">Auto-Sync</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">Delist everywhere when item sells</p>
            </div>

            <div className="text-center p-8 bg-card border border-border rounded-xl">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-6 h-6 text-accent" />
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">Profit Calculator</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">See fees and profits for each platform</p>
            </div>
          </div>
        </div>

        {/* Main Feature Card */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="bg-card border border-border rounded-2xl p-10 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Upload className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-3xl font-bold text-foreground">Everything You Need</h3>
            </div>

            <ul className="grid md:grid-cols-2 gap-4 mb-8 text-foreground">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="leading-relaxed">Cross-list to any platform with one click</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="leading-relaxed">Profit calculator with platform fees</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="leading-relaxed">Bulk upload & listing management</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="leading-relaxed">Auto-delist when item sells</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="leading-relaxed">Track fastest-selling platforms</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="leading-relaxed">One dashboard for all listings</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Pricing Section */}
        <div id="pricing" className="mb-20 max-w-5xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-4 text-foreground">Simple, Transparent Pricing</h3>
          <p className="text-center text-muted-foreground mb-12">Start free, upgrade as you grow</p>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Free Tier */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="text-center mb-6">
                <h4 className="text-lg font-bold text-foreground mb-2">Free</h4>
                <div className="text-4xl font-bold text-foreground mb-1">$0</div>
                <p className="text-sm text-muted-foreground">10 listings/mo</p>
              </div>
              <Link
                href="/signup"
                className="block w-full px-4 py-2.5 bg-secondary text-secondary-foreground text-center font-semibold rounded-lg hover:bg-muted transition-all border border-border"
              >
                Get Started
              </Link>
            </div>

            {/* Starter */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="text-center mb-6">
                <h4 className="text-lg font-bold text-accent mb-2">Starter</h4>
                <div className="text-4xl font-bold text-foreground mb-1">$15</div>
                <p className="text-sm text-muted-foreground">50 listings/mo</p>
              </div>
              <Link
                href="/signup"
                className="block w-full px-4 py-2.5 bg-secondary text-secondary-foreground text-center font-semibold rounded-lg hover:bg-muted transition-all border border-border"
              >
                Get Started
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-card border-2 border-accent rounded-2xl p-6 relative shadow-md">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full">
                  POPULAR
                </span>
              </div>
              <div className="text-center mb-6">
                <h4 className="text-lg font-bold text-accent mb-2">Pro</h4>
                <div className="text-4xl font-bold text-foreground mb-1">$30</div>
                <p className="text-sm text-muted-foreground">200 listings/mo</p>
              </div>
              <Link
                href="/signup"
                className="block w-full px-4 py-2.5 bg-accent text-accent-foreground text-center font-semibold rounded-lg hover:opacity-90 transition-all shadow-sm"
              >
                Get Started
              </Link>
            </div>

            {/* Unlimited */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="text-center mb-6">
                <h4 className="text-lg font-bold text-accent mb-2">Unlimited</h4>
                <div className="text-4xl font-bold text-foreground mb-1">$49</div>
                <p className="text-sm text-muted-foreground">Unlimited listings</p>
              </div>
              <Link
                href="/signup"
                className="block w-full px-4 py-2.5 bg-secondary text-secondary-foreground text-center font-semibold rounded-lg hover:bg-muted transition-all border border-border"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>

        {/* Marketplace Logos */}
        <div className="mb-20 text-center">
          <h3 className="text-xl font-semibold mb-8 text-foreground">Cross-list to all major marketplaces</h3>

          <div className="flex flex-wrap justify-center gap-6 items-center max-w-4xl mx-auto">
            {[
              { name: "eBay", color: "text-[#E53238]" },
              { name: "Etsy", color: "text-[#F1641E]" },
              { name: "Poshmark", color: "text-[#AC1D3F]" },
              { name: "Mercari", color: "text-[#FF0211]" },
              { name: "Depop", color: "text-[#FF0000]" },
            ].map((platform, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-xl px-6 py-4 min-w-[140px] hover:border-accent/50 transition-all"
              >
                <span className={`text-lg font-bold ${platform.color}`}>{platform.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border py-8 text-center text-muted-foreground">
          <p className="text-sm">© 2025 Compr. All rights reserved.</p>
        </footer>
      </main>
    </div>
  )
}
