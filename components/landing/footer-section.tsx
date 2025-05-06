"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Github, Mail, Twitter } from "lucide-react"
import Link from "next/link"

// Default footer links
const defaultFooterLinks = {
  product: [
    { title: "Features", href: "/features" },
    { title: "Use Cases", href: "/use-cases" },
    { title: "Pricing", href: "/pricing" },
    { title: "Roadmap", href: "/roadmap" },
  ],
  resources: [
    { title: "Documentation", href: "/docs" },
    { title: "API Reference", href: "/docs/api" },
    { title: "Tutorials", href: "/tutorials" },
    { title: "Blog", href: "/blog" },
  ],
  company: [
    { title: "About", href: "/about" },
    { title: "Team", href: "/team" },
    { title: "Careers", href: "/careers" },
    { title: "Contact", href: "/contact" },
  ],
  legal: [
    { title: "Privacy Policy", href: "/privacy" },
    { title: "Terms of Service", href: "/terms" },
    { title: "Cookie Policy", href: "/cookies" },
  ],
  social: [
    { title: "GitHub", href: "https://github.com/ssdeanx/ai-sdk-DM", icon: Github },
    { title: "Twitter", href: "https://x.com/deanmachinesai", icon: Twitter },
    { title: "Email", href: "mailto:info@ai-sdk-framework.com", icon: Mail },
  ],
}

export default function FooterSection() {
  const [footerData, setFooterData] = useState({
    companyName: "AI SDK Framework",
    description: "Building the future of AI applications with agents, tools, and memory.",
    copyright: `© ${new Date().getFullYear()} AI SDK Framework. All rights reserved.`,
    links: defaultFooterLinks,
  })

  useEffect(() => {
    // Fetch footer content from API
    const fetchFooterContent = async () => {
      try {
        const response = await fetch("/api/content/footer")
        if (response.ok) {
          const data = await response.json()
          if (data) {
            setFooterData({
              companyName: data.title || footerData.companyName,
              description: data.description || footerData.description,
              copyright: data.data?.copyright || `© ${new Date().getFullYear()} ${data.title || footerData.companyName}. All rights reserved.`,
              links: data.data?.links || footerData.links,
            })
          }
        }
      } catch (error) {
        console.error("Error fetching footer content:", error)
      }
    }

    fetchFooterContent()
  }, [])

  return (
    <footer className="bg-gray-950 border-t border-gray-800">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Company info */}
          <div className="col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Link href="/" className="flex items-center space-x-2 mb-4">
                <div className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 p-1">
                  <div className="h-6 w-6 rounded-full bg-gray-950" />
                </div>
                <span className="font-bold text-xl text-white">{footerData.companyName}</span>
              </Link>
              <p className="text-gray-400 mb-4 max-w-xs">
                {footerData.description}
              </p>
              <div className="flex space-x-4">
                {footerData.links.social.map((link, index) => {
                  const Icon = link.icon
                  return (
                    <Link
                      key={index}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Icon className="h-5 w-5" />
                      <span className="sr-only">{link.title}</span>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          </div>

          {/* Product links */}
          <div className="col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h3 className="text-white font-medium mb-4">Product</h3>
              <ul className="space-y-2">
                {footerData.links.product.map((link, index) => (
                  <li key={index}>
                    <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Resources links */}
          <div className="col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="text-white font-medium mb-4">Resources</h3>
              <ul className="space-y-2">
                {footerData.links.resources.map((link, index) => (
                  <li key={index}>
                    <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Company links */}
          <div className="col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h3 className="text-white font-medium mb-4">Company</h3>
              <ul className="space-y-2">
                {footerData.links.company.map((link, index) => (
                  <li key={index}>
                    <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Legal links */}
          <div className="col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h3 className="text-white font-medium mb-4">Legal</h3>
              <ul className="space-y-2">
                {footerData.links.legal.map((link, index) => (
                  <li key={index}>
                    <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>

        {/* Copyright */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 text-sm"
        >
          {footerData.copyright}
        </motion.div>
      </div>
    </footer>
  )
}
