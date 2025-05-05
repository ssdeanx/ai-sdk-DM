"use client"

import { motion } from "framer-motion"
import { Github, Twitter, Linkedin, Mail, Users, Building, Calendar, Award } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const teamMembers = [
  {
    name: "Sarah Johnson",
    role: "CEO & Co-founder",
    bio: "Sarah has over 15 years of experience in AI and machine learning. Previously led AI initiatives at Google and DeepMind.",
    avatar: "/placeholder.svg?height=100&width=100",
    social: {
      twitter: "https://twitter.com",
      linkedin: "https://linkedin.com",
      github: "https://github.com",
    },
  },
  {
    name: "Michael Chen",
    role: "CTO & Co-founder",
    bio: "Michael is an expert in distributed systems and AI infrastructure. Former principal engineer at OpenAI.",
    avatar: "/placeholder.svg?height=100&width=100",
    social: {
      twitter: "https://twitter.com",
      linkedin: "https://linkedin.com",
      github: "https://github.com",
    },
  },
  {
    name: "Emily Rodriguez",
    role: "Head of Product",
    bio: "Emily specializes in product strategy for AI tools. Previously led product teams at Microsoft and Meta.",
    avatar: "/placeholder.svg?height=100&width=100",
    social: {
      twitter: "https://twitter.com",
      linkedin: "https://linkedin.com",
    },
  },
  {
    name: "David Kim",
    role: "Lead AI Researcher",
    bio: "David focuses on advancing agent-based AI systems. PhD in Computer Science from Stanford University.",
    avatar: "/placeholder.svg?height=100&width=100",
    social: {
      linkedin: "https://linkedin.com",
      github: "https://github.com",
    },
  },
]

const milestones = [
  {
    year: "2020",
    title: "Company Founded",
    description: "Our journey began with a vision to make AI accessible to developers everywhere.",
  },
  {
    year: "2021",
    title: "First Product Launch",
    description: "Released our first AI SDK with support for basic agent capabilities.",
  },
  {
    year: "2022",
    title: "Series A Funding",
    description: "Raised $12M to accelerate product development and expand our team.",
  },
  {
    year: "2023",
    title: "Agentic Toolkit Release",
    description: "Launched our comprehensive toolkit for building advanced AI agents.",
  },
  {
    year: "2024",
    title: "Global Expansion",
    description: "Opened offices in London and Singapore to serve our growing international customer base.",
  },
]

export default function AboutPage() {
  return (
    <div className="container py-12 space-y-20">
      <section className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Our Mission</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We're building the future of AI development by empowering developers to create intelligent, autonomous
            agents that can solve complex problems.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12"
        >
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Our Vision</h2>
            <p className="text-muted-foreground">
              We envision a world where AI agents seamlessly assist humans in solving complex problems, automating
              routine tasks, and unlocking new possibilities for creativity and innovation.
            </p>
            <p className="text-muted-foreground">
              By providing developers with powerful, flexible tools, we aim to democratize access to advanced AI
              capabilities and foster a thriving ecosystem of intelligent applications.
            </p>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Our Values</h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 p-1 mt-1">
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="font-medium">Excellence</span>
                  <p className="text-sm text-muted-foreground">
                    We strive for excellence in everything we do, from code quality to user experience.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 p-1 mt-1">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="font-medium">Collaboration</span>
                  <p className="text-sm text-muted-foreground">
                    We believe in the power of collaboration, both within our team and with our community.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 p-1 mt-1">
                  <Building className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="font-medium">Transparency</span>
                  <p className="text-sm text-muted-foreground">
                    We are committed to transparency in our processes, decisions, and communications.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </motion.div>
      </section>

      <section>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold tracking-tight">Meet Our Team</h2>
          <p className="text-lg text-muted-foreground mt-2">The passionate people behind our platform</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {teamMembers.map((member, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
            >
              <Card>
                <CardHeader className="text-center">
                  <Avatar className="h-24 w-24 mx-auto">
                    <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                    <AvatarFallback>
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="mt-4">{member.name}</CardTitle>
                  <Badge variant="outline">{member.role}</Badge>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">{member.bio}</p>
                  <div className="flex justify-center gap-2">
                    {member.social.twitter && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={member.social.twitter} target="_blank" rel="noopener noreferrer">
                          <Twitter className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {member.social.linkedin && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={member.social.linkedin} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {member.social.github && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={member.social.github} target="_blank" rel="noopener noreferrer">
                          <Github className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold tracking-tight">Our Journey</h2>
          <p className="text-lg text-muted-foreground mt-2">Key milestones in our company's history</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative"
        >
          <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-border" />
          <div className="space-y-12">
            {milestones.map((milestone, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                className={`relative flex ${index % 2 === 0 ? "justify-end md:justify-start" : "justify-end"}`}
              >
                <div className="absolute left-1/2 top-6 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background border-4 border-primary flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div className={`w-full md:w-5/12 ${index % 2 === 0 ? "md:pr-12" : "md:pl-12"}`}>
                  <Card>
                    <CardHeader>
                      <Badge className="w-fit mb-2">{milestone.year}</Badge>
                      <CardTitle>{milestone.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base">{milestone.description}</CardDescription>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 rounded-xl p-8 md:p-12">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight"
          >
            Join Our Team
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            We're always looking for talented individuals to join our mission. Check out our open positions and become
            part of our journey.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 border-none"
            >
              View Open Positions
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="mailto:careers@example.com">
                <Mail className="mr-2 h-4 w-4" />
                Contact Us
              </a>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
