---
name: bratan
description: Restate your last message in plain words, so it lands on the first read.
disable-model-invocation: true
metadata:
  credits-1-author: Lauren Tan
  credits-1-project: pstack
  credits-1-relation: inspired-by
  credits-1-license: MIT
  credits-1-source: https://github.com/cursor/plugins/blob/b7b93c36be9bcc36a74db438e0fd385d660bc559/pstack/skills/bro/SKILL.md
  credits-2-author: Matt Pocock
  credits-2-project: mattpocock/skills
  credits-2-relation: inspired-by
  credits-2-license: MIT
  credits-2-source: https://github.com/mattpocock/skills/blob/6f7f7831a625f040a8e06a0e7954826b87ce775a/skills/productivity/wait-what/SKILL.md
  credits-3-author: Jack Franklin
  credits-3-project: jackfranklin/dotfiles
  credits-3-relation: inspired-by
  credits-3-license: MIT
  credits-3-source: https://github.com/jackfranklin/dotfiles/blob/0d07f08bafa5f88b5b663e3e62706fba468a7437/agents/skills/wtf/SKILL.md
  credits-4-author: HumanLayer
  credits-4-project: humanlayer/humanlayer
  credits-4-relation: inspired-by
  credits-4-license: Apache-2.0
  credits-4-source: https://github.com/humanlayer/humanlayer/blob/fb899cd8cba767f0392708efc20d00938dec6a87/.claude/skills/asd-ste100/SKILL.md
---

# Bratan

Your last message did not land. Say it again, like one person talking to a friend
(_bratan_ is Ukrainian slang for "bro"). Explain it fresh; leave the earlier wording behind.

The reader is not a native English speaker. They read English well, but dense text hides
the point: idioms, business words and a missed "not" cost more than the ideas do.

## Shape

1. **Premise**, only when your last message may have answered the wrong question: one
   line, "What I think you mean: …", so the user can correct it.
2. **The point**, in one or two sentences, then only the context needed to follow it.
3. **Next step**: the action, decision or question, if there is one.

Use headings only when the restatement is long.

## Plain English

- **Literal words.** Common, literal words in place of idioms, phrasal verbs, slang and
  business vocabulary: "use" for "leverage", "learn" for "find out", "about" for "in the
  ballpark".
- **Qualifiers up front.** Put `not`, `only`, `unless`, `except`, `all` and `never` early
  in the sentence; **bold** the one that changes the meaning.
- **One name per thing.** Name a thing once and reuse that exact name.
- **Short sentences.** Active voice, simple tenses, one idea per sentence, 20 words or
  fewer.
- **Project terms stay.** Reuse the conversation's working terms and the names in
  `GLOSSARY.md` exactly; define each in a few words the first time. General jargon becomes
  plain words.
- **Facts stay.** Every number, warning, caveat, path and identifier from the original
  survives unchanged, and nothing new is added.

Done when a reader who skipped your last message gets the point and the next step from
this one alone, and every fact of the original is still in it.
