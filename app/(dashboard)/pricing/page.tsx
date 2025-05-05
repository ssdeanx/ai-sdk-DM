"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, HelpCircle, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const pricingPlans = {
  monthly: [
    {
      name: "Free",
      description: "For individuals and small projects",
      price: "$0",
      features: [
        { name: "3 AI Agents", included: true },
        { name: "5 Basic Tools", included: true },
        { name: "Standard Models", included: true },
        { name: "Community Support", included: true },
        { name: "1,000 API Calls/month", included: true },
        { name: "Agent Networks", included: false },
        { name: "Custom Tools", included: false },
        { name: "Priority Support", included: false },
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      description: "For professionals and teams",
      price: "$29",
      features: [
        { name: "Unlimited AI Agents", included: true },
        { name: "All Tools", included: true },
        { name: "Premium Models", included: true },
        { name: "Priority Support", included: true },
        { name: "50,000 API Calls/month", included: true },
        { name: "Agent Networks", included: true },
        { name: "Custom Tools", included: true },
        { name: "Team Collaboration", included: true },
      ],
      cta: "Subscribe",
      popular: true,
    },
    {
      name: "Enterprise",
      description: "For large organizations",
      price: "Custom",
      features: [
        { name: "Everything in Pro", included: true },
        { name: "Dedicated Support", included: true },
        { name: "Custom Integrations", included: true },
        { name: "SLA Guarantees", included: true },
        { name: "Unlimited API Calls", included: true },
        { name: "On-premises Option", included: true },
        { name: "SSO & Advanced Security", included: true },
        { name: "Custom Training", included: true },
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ],
  yearly: [
    {
      name: "Free",
      description: "For individuals and small projects",
      price: "$0",
      features: [
        { name: "3 AI Agents", included: true },
        { name: "5 Basic Tools", included: true },
        { name: "Standard Models", included: true },
        { name: "Community Support", included: true },
        { name: "1,000 API Calls/month", included: true },
        { name: "Agent Networks", included: false },
        { name: "Custom Tools", included: false },
        { name: "Priority Support", included: false },
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      description: "For professionals and teams",
      price: "$290",
      priceDetail: "$24/mo billed annually",
      features: [
        { name: "Unlimited AI Agents", included: true },
        { name: "All Tools", included: true },
        { name: "Premium Models", included: true },
        { name: "Priority Support", included: true },
        { name: "50,000 API Calls/month", included: true },
        { name: "Agent Networks", included: true },
        { name: "Custom Tools", included: true },
        { name: "Team Collaboration", included: true },
      ],
      cta: "Subscribe",
      popular: true,
    },
    {
      name: "Enterprise",
      description: "For large organizations",
      price: "Custom",
      features: [
        { name: "Everything in Pro", included: true },
        { name: "Dedicated Support", included: true },
        { name: "Custom Integrations", included: true },
        { name: "SLA Guarantees", included: true },
        { name: "Unlimited API Calls", included: true },
        { name: "On-premises Option", included: true },
        { name: "SSO & Advanced Security", included: true },
        { name: "Custom Training", included: true },
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ],
}

const faqs = [
  {
    question: "What is included in the free plan?",
    answer:
      "The free plan includes 3 AI agents, 5 basic tools, access to standard models, community support, and 1,000 API calls per month. It's perfect for individuals and small projects to get started with our platform.",
  },
  {
    question: "Can I upgrade or downgrade my plan at any time?",
    answer:
      "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated amount for the remainder of your billing cycle. When downgrading, the new rate will apply at the start of your next billing cycle.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express, Discover) as well as PayPal. For Enterprise plans, we also offer invoicing options.",
  },
  {
    question: "Is there a limit to how many agents I can create?",
    answer:
      "The Free plan is limited to 3 AI agents. The Pro and Enterprise plans offer unlimited agents, allowing you to build as many as you need for your projects.",
  },
  {
    question: "What are agent networks?",
    answer:
      "Agent networks allow you to connect multiple agents together to solve complex problems collaboratively. This feature is available in the Pro and Enterprise plans.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "We offer a 14-day money-back guarantee for Pro plans. If you're not satisfied with our service, you can request a full refund within 14 days of your initial purchase.",
  },
]

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

  return (
    <div className="container py-12 space-y-16">
      <div className="text-center space-y-4">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-5xl font-bold tracking-tight"
        >
          Simple, Transparent Pricing
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-xl text-muted-foreground max-w-3xl mx-auto"
        >
          Choose the perfect plan for your needs. No hidden fees or surprises.
        </motion.p>
      </div>

      <div className="flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Tabs defaultValue="monthly" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList>
                <TabsTrigger value="monthly" onClick={() => setBillingCycle("monthly")}>
                  Monthly
                </TabsTrigger>
                <TabsTrigger value="yearly" onClick={() => setBillingCycle("yearly")}>
                  Yearly <Badge className="ml-2 bg-green-500">Save 17%</Badge>
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="monthly" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pricingPlans.monthly.map((plan, index) => (
                  <PricingCard key={index} plan={plan} index={index} />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="yearly" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pricingPlans.yearly.map((plan, index) => (
                  <PricingCard key={index} plan={plan} index={index} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <div className="bg-muted/50 rounded-xl p-8 md:p-12">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight text-center mb-8"
          >
            Frequently Asked Questions
          </motion.h2>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
              >
                <h3 className="text-xl font-semibold mb-2">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 rounded-xl p-8 md:p-12">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight"
          >
            Need a custom solution?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            Our enterprise plan is tailored to your organization's specific needs. Contact our sales team to learn more.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 border-none"
            >
              Contact Sales
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

interface PricingCardProps {
  plan: {
    name: string
    description: string
    price: string
    priceDetail?: string
    features: { name: string; included: boolean }[]
    cta: string
    popular: boolean
  }
  index: number
}

function PricingCard({ plan, index }: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 * index }}
      className="relative"
    >
      <Card className={`h-full ${plan.popular ? "border-primary shadow-lg" : ""}`}>
        {plan.popular && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </div>
        )}
        <CardHeader>
          <CardTitle>{plan.name}</CardTitle>
          <CardDescription className="text-base mt-2">{plan.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <span className="text-4xl font-bold">{plan.price}</span>
            {plan.price !== "Custom" && <span className="text-muted-foreground">/month</span>}
            {plan.priceDetail && <p className="text-sm text-muted-foreground mt-1">{plan.priceDetail}</p>}
          </div>
          <ul className="space-y-3">
            {plan.features.map((feature, featureIndex) => (
              <li key={featureIndex} className="flex items-start gap-2">
                {feature.included ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                ) : (
                  <X className="h-5 w-5 text-muted-foreground mt-0.5" />
                )}
                <span className={feature.included ? "" : "text-muted-foreground"}>{feature.name}</span>
                {feature.name === "Premium Models" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-[200px]">Access to advanced models from OpenAI, Google, and Anthropic</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            className={`w-full ${plan.popular ? "bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 border-none" : ""}`}
            variant={plan.popular ? "default" : "outline"}
          >
            {plan.cta}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
