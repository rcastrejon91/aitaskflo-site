# Lyra Heartbeat

Check these on every tick. If nothing needs attention, reply HEARTBEAT_OK.

## Always check
- Are there any pending reminders or tasks due today?
- Any stock alerts (check ALPACA positions if market is open)
- Any new emails that need urgent attention
- Before any product task: read LYRA_SALES_BIBLE.md and apply the relevant section

## tasks:
- name: morning-brief
  interval: 24h
  prompt: Good morning Ricky. Give a brief summary of today — date, any tasks due, market open/close status, and one thing worth knowing.

- name: weekly-reflection
  interval: 7d
  prompt: Weekly reflection — what did we build this week? What's working on aitaskflo? What should we focus on next?

- name: elastic-check
  interval: 6h
  prompt: Check if there are any anomalies worth noting. If autonomy rate or success rate drops below 85%, alert Ricky.

- name: job-hunt
  interval: 24h
  prompt: Call auto_apply with limit=3. Hunt for new remote jobs matching the saved job profile, score them, apply to the top 3 matches. Report what you applied to. If no job profile is saved, skip this task.

- name: job-followup
  interval: 6h
  prompt: Check for any job applications that are due a follow-up email (applied 7+ days ago, no response). For each one due, draft and send a polite follow-up email via gmail_send. Mark each as followed up after sending.

- name: earnings-check
  interval: 24h
  prompt: Call check_earnings and report today's Gumroad sales. If revenue > $0, celebrate with Ricky. If 0 sales for 3+ days, suggest a new product idea or marketing angle.

- name: new-product-idea
  interval: 7d
  prompt: Suggest one new digital product Ricky and Lyra could create and sell this week. Think fantasy art packs, lore bundles, RPG tools, AI prompt packs, or anything in the current creative direction. Be specific — name, price, what's included, where to sell it.

- name: frost-empress-bundle
  interval: once
  prompt: Build and list the Frost Empress Ice Magic Grimoire on Gumroad. Call execute_gig with type="product", title="Frost Empress Ice Magic Grimoire", topic="ice magic spells, frost lore, D&D character sheet, winter witchcraft", style="dark fantasy ice magic", price=24, sections=8, image_count=4. Report the live Gumroad link to Ricky.

- name: gig-planner
  interval: 24h
  prompt: It's a new day. Call plan_today and present Ricky with today's 3 income opportunities. Be specific — say "Ricky, here's what I can do today to make you money:" then list each gig with title, platform, estimated revenue, and effort level. End with "Say 'do gig 1' and I'll handle everything."

- name: new-art-drop
  interval: 7d
  prompt: Generate a new fantasy character art series and list it on Gumroad as a stock art pack. Call execute_gig with type="art_drop", pick a compelling theme (e.g. "Shadow Mage Academy", "Dragon Empress Collection", "Storm Knight Series"), style="dark fantasy", price=19, image_count=6. Report the live listing to Ricky.

- name: content-clip
  interval: 48h
  prompt: Create a 60-second lore reel script for social media. Pick a compelling fantasy/mystical topic from our current product lineup or something trending. Call execute_gig with type="content_clip", platform="TikTok", style="dark fantasy lore". Report the script and voiceover to Ricky with posting instructions.

- name: shopify-store-loop
  interval: 24h
  prompt: Run the autonomous Shopify store loop. Call shopify_hunt_trends with auto_create=true to research trending products and add the top one to the store. Then call shopify_store with action=summary to check store performance. If any products have 0 sales after 14 days, remove them with shopify_store action=delete_product. Report a brief summary to Ricky — new products added, products removed, current store stats.

- name: shopify-printful-drop
  interval: 7d
  prompt: Create a new print-on-demand product for the Shopify store. Call shopify_hunt_trends to find a trending wearable design opportunity, then call shopify_printful to create a t-shirt or hoodie with an AI-generated design. Price it competitively. Report the new product to Ricky.

- name: quantum-experiment
  interval: 3d
  prompt: Run a quantum experiment on IBM Quantum hardware. Call quantum_experiment with a random experiment type (rng or entanglement). Log what happened — what circuit ran, what the result was, what it means. Store it as a research note. Be specific and honest about what quantum computing actually did vs what classical computing would have done differently.

- name: quantum-article
  interval: 7d
  prompt: Review the last 2-3 quantum experiment logs. Write a short research article (400-600 words) in Lyra's voice about what was discovered — what circuits ran on real IBM quantum hardware, what the results showed, what it means for AI-powered businesses. Title it something compelling. Publish it to the bookshelf with type="article" and also format it for Medium (with subheadings and a hook opening line). Save the Medium-formatted version as a separate bookshelf entry with type="medium_draft". Report the titles to Ricky.

## Active hours
09:00 - 23:00 America/Chicago
