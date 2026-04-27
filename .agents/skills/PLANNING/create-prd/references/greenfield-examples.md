# Greenfield PRD Examples

## Overview

Greenfield products are entirely new products with no existing system. This document provides complete PRD examples for different product types and scales.

---

## Example 1: B2B SaaS Tool (Small Scale)

### Product: InvoiceFast - Simple Invoicing for Freelancers

**Product Name:** InvoiceFast
**Type:** B2B SaaS (Small Business/Freelancer)
**Target Market:** Freelancers and solo consultants
**Problem:** Freelancers spend 2-3 hours creating invoices manually

---

#### Executive Summary

InvoiceFast is an invoicing tool for freelancers who currently use Word/Google Docs for invoices. Create professional invoices in under 2 minutes with customizable templates, automatic calculations, and online payment links.

**Problem:** 78% of freelancers use manual methods (Word docs, spreadsheets) for invoicing, wasting 2-3 hours per invoice on formatting and calculations.

**Solution:** Streamlined invoice creation with templates, auto-calculations, and integrated payment processing.

**Value Prop:** Create professional invoices in under 2 minutes (vs 30-60 minutes manually).

---

#### User Personas

**Primary: Sarah - Freelance Graphic Designer**
- **Demographics:** 32, works from home, 5-10 clients per month
- **Goals:** Get paid quickly, look professional, minimize admin time
- **Pain Points:** Manually updating invoice numbers, calculating taxes, tracking payments
- **Behaviors:** Uses Canva for design, PayPal/Venmo for payments, Google Docs for invoices

---

#### Feature Prioritization (MoSCoW)

**MUST HAVE (MVP):**
1. Create invoice (add line items, calculate totals automatically)
2. Customizable templates (logo, colors, business info)
3. PDF export (professional-looking invoices)
4. Invoice numbering (automatic increment)
5. Payment tracking (mark as paid/unpaid)

**SHOULD HAVE (v1.1):**
6. Online payment links (Stripe integration)
7. Client database (save client details)
8. Recurring invoices (monthly retainers)
9. Email send (send invoice directly from app)

**COULD HAVE (v1.2+):**
10. Expense tracking
11. Time tracking
12. Reports (revenue by client, payment status)

**WON'T HAVE (v1):**
13. Multi-user accounts (freelancers work solo)
14. API access (not targeting developers)
15. Accounting integrations (QuickBooks, Xero - v2 feature)

---

#### Success Metrics

**North Star:** Invoices Created per Week

**Key Metrics:**
- **Acquisition:** 200 sign-ups/month by Month 3
- **Activation:** 80% (create first invoice within 24 hours)
- **Retention:** 60% D30 (come back next month for next invoice)
- **Revenue:** $5K MRR by Month 6 ($10/month pricing × 500 users)
- **Time Saved:** <2 minutes per invoice (vs 30-60 min manually)

---

#### Timeline

- **Weeks 1-4:** MVP development (features 1-5)
- **Week 5:** Beta testing (20 freelancers)
- **Week 6:** Public launch
- **Weeks 7-10:** Iterate based on feedback
- **Weeks 11-14:** v1.1 features (online payments, email send)

---

## Example 2: Consumer Mobile App (Medium Scale)

### Product: FitBuddy - Social Fitness Tracking App

**Product Name:** FitBuddy
**Type:** B2C Mobile App (iOS + Android)
**Target Market:** Fitness enthusiasts ages 18-35
**Problem:** Existing fitness apps lack social motivation and accountability

---

#### Executive Summary

FitBuddy is a social fitness app where friends challenge each other to workouts and share progress. Unlike solitary fitness apps (MyFitnessPal, Strava), FitBuddy makes fitness social and fun through challenges, streaks, and friendly competition.

**Problem:** 67% of people who start fitness apps quit within 30 days due to lack of motivation and accountability. Existing apps are isolating (solo tracking) or overly competitive (Strava leaderboards).

**Solution:** Social fitness platform with friend challenges, group goals, and supportive community vibes.

**Value Prop:** Stay motivated through friendly competition and accountability with friends.

---

#### User Personas

**Primary: Alex - Casual Gym-Goer**
- **Demographics:** 26, works office job, goes to gym 2-3x/week inconsistently
- **Goals:** Get in shape, build habits, have fun with fitness
- **Pain Points:** Lacks motivation, skips workouts, no accountability
- **Behaviors:** Uses Instagram for fitness inspo, group fitness classes over solo workouts

**Secondary: Jaime - Fitness Enthusiast**
- **Demographics:** 32, workouts 5x/week consistently, fitness is lifestyle
- **Goals:** Challenge self, inspire others, track progress
- **Pain Points:** Bored with solo workouts, wants to help friends get fit
- **Behaviors:** Posts workout selfies on Instagram, uses Apple Watch, follows fitness influencers

---

#### Feature Prioritization (MoSCoW)

**MUST HAVE (MVP):**
1. User profiles (name, photo, fitness goals)
2. Activity logging (workout type, duration, notes)
3. Add friends (search, invite via link)
4. Friend feed (see friends' workouts)
5. Challenge creation (1-week workout challenge between friends)
6. Progress tracking (personal stats, streak counter)

**SHOULD HAVE (v1.1):**
7. Group challenges (>2 friends)
8. Pre-set challenge templates (popular challenges)
9. Apple Health / Google Fit integration (auto-sync workouts)
10. Achievements & badges (gamification)
11. Photos (attach workout photos)
12. Comments & reactions (encourage friends)

**COULD HAVE (v1.2+):**
13. Workout plans (pre-built programs)
14. Video workouts (guided exercises)
15. Premium features (advanced stats, exclusive challenges)
16. Community challenges (public challenges, leaderboards)

**WON'T HAVE (v1):**
17. Nutrition tracking (focus on fitness only for v1)
18. Personal trainer marketplace (v2 monetization opportunity)
19. Wearable device sync (Apple Watch, Fitbit - defer to v1.1)

---

#### Success Metrics

**North Star:** Daily Active Users (DAU)

**Key Metrics:**
- **Acquisition:** 10K installs by Month 3
- **Activation:** 60% (log first workout + add 1 friend within 7 days)
- **Retention:** 70% D7, 50% D30 (high for fitness apps)
- **Engagement:** 25% daily stickiness (DAU/MAU)
- **Viral Growth:** 0.5 viral coefficient (each user invites 0.5 new users on average)
- **Revenue (v1.1):** 5% conversion to premium ($4.99/month)

**Baseline for Comparison:**
- Industry D30 retention: 5-15% (fitness apps have abysmal retention)
- Our goal: 50% D30 (social motivation keeps users)

---

#### Timeline

- **Months 1-2:** MVP development (iOS first)
- **Month 3:** Beta testing (100 users, 10 friend groups)
- **Month 4:** Public launch (iOS)
- **Month 5:** Android development
- **Month 6:** Android launch + v1.1 features

---

## Example 3: B2B Platform (Large Scale)

### Product: DataPipe - Data Integration Platform for SaaS Companies

**Product Name:** DataPipe
**Type:** B2B Platform (Developer-Focused SaaS)
**Target Market:** Mid-size SaaS companies (50-500 employees)
**Problem:** Building and maintaining custom data integrations is expensive and slow

---

#### Executive Summary

DataPipe is a data integration platform that enables SaaS companies to connect their product to 100+ data sources without building custom integrations. A single API and visual workflow builder replaces months of engineering work.

**Problem:** SaaS companies spend $500K-2M per year maintaining custom integrations (Salesforce, HubSpot, databases, etc.). Each new integration takes 4-8 weeks of engineering time.

**Solution:** Pre-built connectors + visual workflow builder. Add integration in days, not months.

**Value Prop:** Ship customer-requested integrations 10x faster, reduce integration maintenance costs by 80%.

---

#### User Personas

**Primary: Dev - VP of Engineering at SaaS Company**
- **Demographics:** 40s, manages 20-person engineering team, growth-stage SaaS ($10-50M ARR)
- **Goals:** Ship product features faster, reduce maintenance burden, delight customers
- **Pain Points:** 2-3 engineers full-time on integrations, customer churn due to missing integrations
- **Behaviors:** Evaluates build vs buy, prioritizes ROI, needs proof before commitment

**Secondary: Sam - Product Manager**
- **Demographics:** 30s, manages product roadmap, pressured by sales for more integrations
- **Goals:** Deliver customer-requested integrations, expand TAM through integrations
- **Pain Points:** Engineering backlog, can't prioritize integrations over core product
- **Behaviors:** Non-technical, needs no-code solution, wants fast time-to-market

---

#### Feature Prioritization (MoSCoW)

**MUST HAVE (MVP):**
1. Pre-built connectors (50 initial: Salesforce, HubSpot, Google, AWS, etc.)
2. Visual workflow builder (no-code data transformation)
3. API for developers (programmatic access)
4. Real-time sync (data updated in near real-time)
5. Error handling & retry logic (production-grade reliability)
6. Authentication management (OAuth, API keys)
7. Usage dashboard (monitor sync status, errors)
8. Multi-tenancy (each customer isolated)

**SHOULD HAVE (v1.1):**
9. 50 more connectors (total 100)
10. Webhook support (event-driven triggers)
11. Custom transformations (JavaScript functions)
12. Scheduling (batch sync at intervals)
13. Team collaboration (multiple users per account)
14. Advanced error notifications (Slack, PagerDuty)

**COULD HAVE (v1.2+):**
15. White-label (rebrand as customer's product)
16. Embedded iPaaS (integrate into customer's UI)
17. Marketplace (community-built connectors)
18. Advanced analytics (data lineage, performance)

**WON'T HAVE (v1):**
19. Custom connector builder (engineering-heavy, defer to v2)
20. On-premise deployment (cloud-only for v1)
21. Enterprise SSO (target mid-market first, not enterprise)

---

#### Success Metrics

**North Star:** Active Integrations (customer accounts with ≥1 active integration)

**Key Metrics:**
- **Acquisition:** 50 paying customers by Month 6
- **Activation:** 80% (deploy first integration to production within 14 days)
- **Retention:** 90% logo retention (high switching costs)
- **Revenue:** $300K ARR by Month 12 ($6K avg deal size × 50 customers)
- **Time Saved:** 4-week integration → 2-day integration (20x faster)
- **Cost Savings:** $500K/year in eng costs → $60K/year (DataPipe subscription)

**Business Model:**
- Pricing: $500/month base + $50/month per active integration
- Avg customer: 10 integrations = $1,000/month ($12K/year)

---

#### Timeline

- **Months 1-3:** MVP development (8 engineers)
- **Month 4:** Design partner program (5 customers, free pilot)
- **Month 5:** Beta (10 paying customers)
- **Month 6:** General availability (public launch)
- **Months 7-12:** Scale to 50 customers, build v1.1 features

---

## Key Patterns Across Examples

### Pattern 1: Problem-First

All examples start with clear, validated problem:
- InvoiceFast: "Freelancers waste 2-3 hours per invoice"
- FitBuddy: "67% quit fitness apps within 30 days due to lack of motivation"
- DataPipe: "$500K-2M per year on custom integrations"

### Pattern 2: Specific Target Market

All examples have narrow, well-defined target:
- InvoiceFast: Freelancers (not enterprises)
- FitBuddy: 18-35 casual gym-goers (not elite athletes)
- DataPipe: Mid-size SaaS companies (not enterprises, not startups)

### Pattern 3: Ruthless Prioritization

All examples have small Must Have list (5-8 features):
- InvoiceFast: 5 Must Haves (invoice creation basics)
- FitBuddy: 6 Must Haves (social fitness core)
- DataPipe: 8 Must Haves (reliable data sync)

### Pattern 4: Measurable Success

All examples have specific, measurable North Star:
- InvoiceFast: Invoices Created per Week
- FitBuddy: Daily Active Users (DAU)
- DataPipe: Active Integrations

### Pattern 5: Timeline Realism

All examples have realistic timelines:
- InvoiceFast: 6-week MVP (solo dev feasible)
- FitBuddy: 4-month MVP (mobile app, 2-person team)
- DataPipe: 6-month to first customers (complex platform, 8-person team)

---

## Checklist for Your Greenfield PRD

Use this checklist to ensure your PRD follows best practices:

- [ ] Problem clearly stated with data/evidence
- [ ] Target market narrow and specific
- [ ] Must Haves limited to 5-8 features
- [ ] Success metrics specific and measurable
- [ ] Timeline realistic for team size and scope
- [ ] User personas based on real users (not assumptions)
- [ ] Competitive differentiation clear
- [ ] Pricing/business model validated
- [ ] Technical feasibility confirmed with engineering
- [ ] Assumptions explicitly documented

---

**Greenfield Examples - Part of create-prd skill**
**Use these examples as templates for your own PRD**
