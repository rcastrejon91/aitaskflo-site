"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
import { 
  Bot, 
  Zap, 
  FileText, 
  ShoppingCart, 
  ArrowRight,
  Check,
  Sparkles
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-gray-800/50 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            AITaskFlo
          </div>
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-orange-900/20 animate-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-5xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-8"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">AI-Powered Automation</span>
            </motion.div>

            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                Automate Anything
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                with AI in Seconds
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              No developers. No $50k bills. Just plug-and-play AI that{" "}
              <span className="text-orange-400 font-semibold">prints money</span> for your business.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button 
                size="xl" 
                variant="gradient"
                className="group shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 transition-all duration-300"
              >
                See Live Demos
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="xl" 
                variant="premium"
                className="group shadow-2xl shadow-orange-500/50 hover:shadow-orange-500/70 transition-all duration-300"
              >
                Get Your Custom System – From $5k
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => {
            const randomX = Math.random() * 100;
            const randomY = Math.random() * 100;
            const randomDuration = Math.random() * 3 + 2;
            const randomDelay = Math.random() * 2;
            
            return (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-purple-400 rounded-full"
                initial={{
                  x: `${randomX}%`,
                  y: `${randomY}%`,
                  opacity: 0,
                }}
                animate={{
                  y: [`${randomY}%`, `${(randomY + 30) % 100}%`],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: randomDuration,
                  repeat: Infinity,
                  delay: randomDelay,
                }}
              />
            );
          })}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              What We Build For You
            </h2>
            <p className="text-gray-400 text-lg">AI systems that work 24/7 to grow your revenue</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Bot,
                title: "AI Customer Support Bots",
                description: "Saves $10k+/month",
                gradient: "from-purple-500/20 to-purple-600/20",
                borderGradient: "border-purple-500/30",
                iconColor: "text-purple-400",
              },
              {
                icon: Zap,
                title: "Lead Generation on Autopilot",
                description: "Never miss a lead again",
                gradient: "from-pink-500/20 to-pink-600/20",
                borderGradient: "border-pink-500/30",
                iconColor: "text-pink-400",
              },
              {
                icon: FileText,
                title: "Content & Social Media Machines",
                description: "Publish while you sleep",
                gradient: "from-orange-500/20 to-orange-600/20",
                borderGradient: "border-orange-500/30",
                iconColor: "text-orange-400",
              },
              {
                icon: ShoppingCart,
                title: "E-commerce Upsell Automation",
                description: "Increase AOV automatically",
                gradient: "from-red-500/20 to-red-600/20",
                borderGradient: "border-red-500/30",
                iconColor: "text-red-400",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className={`bg-gradient-to-br ${feature.gradient} border ${feature.borderGradient} backdrop-blur-xl hover:scale-105 transition-all duration-300 cursor-pointer group`}>
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                    </div>
                    <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                    <CardDescription className="text-gray-300">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 relative bg-gradient-to-b from-transparent via-gray-950/50 to-transparent">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Choose Your Plan
            </h2>
            <p className="text-gray-400 text-lg">From templates to custom enterprise solutions</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$99",
                period: "/month",
                description: "Basic templates",
                features: [
                  "Pre-built AI templates",
                  "Basic customization",
                  "Email support",
                  "Monthly updates",
                ],
                gradient: "from-gray-800/50 to-gray-900/50",
                borderGradient: "border-gray-700/50",
                buttonVariant: "outline" as const,
              },
              {
                name: "Pro",
                price: "$5,000",
                period: " one-time",
                description: "Custom system + 30 days support",
                features: [
                  "Fully custom AI system",
                  "30 days dedicated support",
                  "Priority updates",
                  "Custom integrations",
                  "Training & documentation",
                ],
                gradient: "from-purple-900/50 via-pink-900/50 to-orange-900/50",
                borderGradient: "border-purple-500/50",
                buttonVariant: "gradient" as const,
                popular: true,
              },
              {
                name: "Agency",
                price: "$15,000+",
                period: "",
                description: "White-label + revenue share",
                features: [
                  "White-label solution",
                  "Revenue share model",
                  "Dedicated account manager",
                  "Custom branding",
                  "API access",
                  "Unlimited support",
                ],
                gradient: "from-amber-900/50 via-orange-900/50 to-red-900/50",
                borderGradient: "border-orange-500/50",
                buttonVariant: "premium" as const,
              },
            ].map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <Card className={`bg-gradient-to-br ${plan.gradient} border-2 ${plan.borderGradient} backdrop-blur-xl h-full flex flex-col ${plan.popular ? 'scale-105 shadow-2xl shadow-purple-500/20' : ''}`}>
                  <CardHeader>
                    <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-gray-400">{plan.period}</span>
                    </div>
                    <CardDescription className="text-gray-300">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-3 mb-6 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button variant={plan.buttonVariant} size="lg" className="w-full">
                      Get Started
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <Card className="bg-gradient-to-br from-purple-900/30 via-pink-900/30 to-orange-900/30 border-2 border-purple-500/50 backdrop-blur-xl p-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_70%)]" />
              <div className="relative z-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mb-6"
                >
                  <Sparkles className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                  Ready to Automate Your Business?
                </h2>
                <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                  Book a 15-min call → I'll build you a free proof-of-concept
                </p>
                <Button 
                  size="xl" 
                  variant="gradient"
                  className="group shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 transition-all duration-300"
                >
                  Book Your Free Call
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-8">
        <div className="container mx-auto px-6 text-center text-gray-400">
          <p>&copy; 2024 AITaskFlo. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
