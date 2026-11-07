// ABOUT — the story behind the work

import type { iNodeContent } from "../lib/interface";
import { navigationMenu } from "./shared";

export const AboutContent: iNodeContent = {
  "#app": {
    content: {
      ...navigationMenu,
      "main": {
        content: {
          "section#about-hero": {
            content: {
              ".shell": {
                content: {
                  "p.eyebrow": { content: "THE STORY BEHIND THE WORK" },
                  "h1.title": { content: "I have always been drawn to making things." },
                  "p.description": { content: "The material has changed over the years—from paper, pixels, and packaging to software, machines, and music—but the impulse remains the same: to turn an idea into something real." },
                },
              },
            },
          },
          "section#origin": {
            content: {
              ".shell": {
                content: {
                  "h2.title": { content: "Before programming, there was making." },
                  "p.origin-first": { content: "My creative journey began with manual illustration and continued into computer graphics during university in 2002. At the same time, I started small side businesses in printing and high-school yearbook design." },
                  "p.origin-second": { content: "I later worked as an album-cover designer and created music award designs. In 2008, I received the AMI Award for Best Album Cover Design in Indonesia. That recognition encouraged me to step outside music and explore advertising, below-the-line campaigns, and visual communication more broadly." },
                },
              },
            },
          },
          "section#workshop": {
            content: {
              ".shell": {
                content: {
                  "h2.title": { content: "Design became production." },
                  "p.workshop-first": { content: "Because I also handled the printing, design projects often became complete production projects. Eventually I built my own workshop, expanding from printing into packaging and physical fabrication." },
                  "p.workshop-second": { content: "I worked on exclusive boxes and packaging for clients such as Harvest Cake & Chocolate and Garuda Indonesia, while also helping businesses develop their identities from the first visual direction through final production." },
                  "blockquote": { content: "A product has its price, but its packaging adds value." },
                },
              },
            },
          },
          "section#turning-point": {
            content: {
              ".shell": {
                content: {
                  "h2.title": { content: "The problem that led me to code." },
                  "p.turning-first": { content: "Running a workshop taught me that quality depends on every detail of a process. Manual repetition, inconsistent execution, and work that could not be properly tracked created real losses." },
                  "p.turning-second": { content: "I began looking for a way to digitize and automate the work. At first, I only wanted to build a printing production calculator. But programming turned out to be much deeper than I expected, and I gradually became immersed in it." },
                },
              },
            },
          },
          "section#now": {
            content: {
              ".shell": {
                content: {
                  "h2.title": { content: "Now I build the tools behind the tools." },
                  "p.now-first": { content: "That journey led me to build printing calculators, parametric dieline generators with SVG and G-code output, automated CMS systems, frontend frameworks, JavaScript libraries, CLI tools, and DIY CNC machines." },
                  "p.now-second": { content: "I am especially interested in frontend engineering because I want to understand and improve the foundations we often take for granted. I build my own tools to reduce unnecessary setup, fragile dependencies, repetitive work, and systems that are difficult to understand or maintain." },
                  "p.now-third": { content: "My work moves between visual design, software, data, automation, and physical production. These are not separate identities to me. They are different materials for the same instinct: understand deeply, build carefully, and make something useful." },
                },
              },
            },
          },
          "section#principles": {
            content: {
              ".shell": {
                content: {
                  "h2.title": { content: "How I try to work" },
                  ".principles": {
                    content: [
                      { ".principle": { "h3": { content: "Understand the whole process" }, "p": { content: "A polished result is not enough. I want to understand what happens before, during, and after it is created." } } },
                      { ".principle": { "h3": { content: "Make work traceable" }, "p": { content: "When a process can be seen, recorded, and followed, it becomes easier to improve and easier to trust." } } },
                      { ".principle": { "h3": { content: "Remove repetition" }, "p": { content: "Repetitive work is often a signal that a better process or a new tool is waiting to be built." } } },
                      { ".principle": { "h3": { content: "Keep learning" }, "p": { content: "I do not need to know everything at the beginning. I need to be willing to go deep enough to make it work." } } },
                    ],
                  },
                },
              },
            },
          },
          "section#closing": {
            content: {
              ".shell": {
                content: {
                  "h2.title": { content: "We learn, we build, we innovate." },
                  "p.description": { content: "This portfolio is an archive of that ongoing process—not a claim that I have finished learning, but a record of what I have chosen to make along the way." },
                },
              },
            },
          },
        },
      },
      "footer": {
        content: {
          ".inner": {
            content: {
              ".brand": { content: "Frontend Engineer & Maker" },
              ".tagline": { content: "Designing, engineering, fabricating, and composing." },
            },
          },
        },
      },
    },
  },
};
