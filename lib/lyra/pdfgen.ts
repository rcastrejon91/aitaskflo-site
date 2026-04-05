/**
 * lib/lyra/pdfgen.ts
 *
 * Generates Amazon KDP-ready PDFs for books and comics.
 * Uses @react-pdf/renderer for layout.
 * Output: 6×9" trim (standard KDP paperback) for books, 6.625×10.25" for comics.
 */

import React from "react";
import {
  Document, Page, Text, View, Image, StyleSheet, Font, pdf,
} from "@react-pdf/renderer";
import type { GeneratedBook } from "./bookgen";

// ── Fonts ─────────────────────────────────────────────────────────────────────
// Use built-in Helvetica / Times — no font files needed

// ── KDP Dimensions ───────────────────────────────────────────────────────────
const BOOK_W = 6 * 72;    // 432pt = 6"
const BOOK_H = 9 * 72;    // 648pt = 9"
const COMIC_W = 6.625 * 72;
const COMIC_H = 10.25 * 72;
const MARGIN = 54;         // 0.75" margins
const INNER_MARGIN = 54;   // inside margin

// ── Book PDF ──────────────────────────────────────────────────────────────────

const bookStyles = StyleSheet.create({
  page: {
    width: BOOK_W, height: BOOK_H,
    backgroundColor: "#FFFFFF",
    fontFamily: "Times-Roman",
  },
  coverPage: {
    width: BOOK_W, height: BOOK_H,
    backgroundColor: "#0a0a14",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  coverImage: {
    width: BOOK_W, height: BOOK_H * 0.65,
    objectFit: "cover",
  },
  coverOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: BOOK_H * 0.45,
    backgroundColor: "#0a0a14",
    alignItems: "center",
    justifyContent: "center",
    padding: MARGIN,
  },
  coverTitle: {
    fontSize: 32, fontFamily: "Helvetica-Bold",
    color: "#FFFFFF", textAlign: "center",
    marginBottom: 8, lineHeight: 1.2,
  },
  coverSubtitle: {
    fontSize: 14, fontFamily: "Helvetica",
    color: "rgba(255,255,255,0.6)", textAlign: "center",
    marginBottom: 16,
  },
  coverAuthor: {
    fontSize: 13, fontFamily: "Helvetica",
    color: "rgba(255,255,255,0.45)", textAlign: "center",
  },
  copyrightPage: {
    width: BOOK_W, height: BOOK_H,
    backgroundColor: "#FFFFFF",
    padding: MARGIN, paddingTop: BOOK_H * 0.35,
    justifyContent: "flex-start",
  },
  copyrightText: {
    fontSize: 9, fontFamily: "Times-Roman",
    color: "#555555", textAlign: "center",
    lineHeight: 1.6, marginBottom: 6,
  },
  tocPage: {
    width: BOOK_W, height: BOOK_H,
    backgroundColor: "#FFFFFF",
    padding: MARGIN, paddingTop: MARGIN * 1.5,
  },
  tocTitle: {
    fontSize: 20, fontFamily: "Helvetica-Bold",
    color: "#1a1a2e", marginBottom: 24,
    textAlign: "center",
  },
  tocRow: {
    flexDirection: "row", justifyContent: "space-between",
    marginBottom: 10, borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5", paddingBottom: 6,
  },
  tocChapter: {
    fontSize: 11, fontFamily: "Times-Roman", color: "#333333", flex: 1,
  },
  tocPage_: {
    fontSize: 11, fontFamily: "Times-Roman", color: "#777777",
  },
  chapterPage: {
    width: BOOK_W, height: BOOK_H,
    backgroundColor: "#FFFFFF",
    paddingLeft: INNER_MARGIN, paddingRight: MARGIN,
    paddingTop: MARGIN, paddingBottom: MARGIN,
  },
  chapterNumber: {
    fontSize: 10, fontFamily: "Helvetica",
    color: "#888888", textTransform: "uppercase",
    letterSpacing: 2, marginBottom: 6, textAlign: "center",
  },
  chapterTitle: {
    fontSize: 22, fontFamily: "Helvetica-Bold",
    color: "#1a1a2e", textAlign: "center",
    marginBottom: 20, lineHeight: 1.3,
  },
  chapterDivider: {
    width: 40, height: 2, backgroundColor: "#6d28d9",
    alignSelf: "center", marginBottom: 20,
  },
  chapterImage: {
    width: BOOK_W - INNER_MARGIN - MARGIN,
    height: 180, objectFit: "cover",
    borderRadius: 4, marginBottom: 18,
  },
  bodyText: {
    fontSize: 11, fontFamily: "Times-Roman",
    color: "#1a1a1a", lineHeight: 1.8,
    textAlign: "justify", marginBottom: 10,
  },
  pageNumber: {
    position: "absolute", bottom: 28,
    left: 0, right: 0, textAlign: "center",
    fontSize: 9, fontFamily: "Helvetica",
    color: "#aaaaaa",
  },
  pageHeader: {
    position: "absolute", top: 20,
    left: INNER_MARGIN, right: MARGIN,
    flexDirection: "row", justifyContent: "space-between",
  },
  headerText: {
    fontSize: 8, fontFamily: "Helvetica",
    color: "#bbbbbb", letterSpacing: 0.5,
  },
});

function BookCoverPage({ book }: { book: GeneratedBook }) {
  const title = String(book.title ?? "Untitled");
  const subtitle = book.subtitle ? String(book.subtitle) : "";
  const author = String(book.author ?? "Lyra");
  const overlayChildren = [
    React.createElement(Text, { key: "title", style: bookStyles.coverTitle }, title),
    ...(subtitle ? [React.createElement(Text, { key: "sub", style: bookStyles.coverSubtitle }, subtitle)] : []),
    React.createElement(Text, { key: "author", style: bookStyles.coverAuthor }, `by ${author}`),
  ];
  return React.createElement(Page, { size: [BOOK_W, BOOK_H], style: bookStyles.coverPage },
    book.coverUrl
      ? React.createElement(Image, { key: "img", src: book.coverUrl, style: bookStyles.coverImage })
      : React.createElement(View, { key: "imgbg", style: { ...bookStyles.coverImage, backgroundColor: "#1a0a2e" } }),
    React.createElement(View, { key: "overlay", style: bookStyles.coverOverlay }, ...overlayChildren),
  );
}

function BookCopyrightPage({ book }: { book: GeneratedBook }) {
  return React.createElement(Page, { size: [BOOK_W, BOOK_H], style: bookStyles.copyrightPage },
    React.createElement(Text, { style: bookStyles.copyrightText }, String(book.title ?? "")),
    React.createElement(Text, { style: bookStyles.copyrightText }, String(book.subtitle ?? "")),
    React.createElement(Text, { style: { ...bookStyles.copyrightText, marginTop: 16 } },
      `Copyright © ${new Date().getFullYear()} ${String(book.author ?? "Lyra")}`),
    React.createElement(Text, { style: bookStyles.copyrightText },
      "All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form or by any means without the prior written permission of the author."),
    React.createElement(Text, { style: { ...bookStyles.copyrightText, marginTop: 16 } },
      "Generated by Lyra AI · aitaskflo.com"),
    React.createElement(Text, { style: bookStyles.copyrightText },
      "First Edition"),
  );
}

function BookTocPage({ book }: { book: GeneratedBook }) {
  return React.createElement(Page, { size: [BOOK_W, BOOK_H], style: bookStyles.tocPage },
    React.createElement(Text, { style: bookStyles.tocTitle }, "Contents"),
    ...book.chapters.map((ch, i) =>
      React.createElement(View, { key: i, style: bookStyles.tocRow },
        React.createElement(Text, { style: bookStyles.tocChapter },
          `${String(ch.number ?? i + 1)}. ${String(ch.title ?? "")}`),
        React.createElement(Text, { style: bookStyles.tocPage_ }, String(i + 4)),
      )
    )
  );
}

function BookChapterPage({ chapter, bookTitle, pageNum }: {
  chapter: GeneratedBook["chapters"][0];
  bookTitle: string;
  pageNum: number;
}) {
  const paragraphs = chapter.content.split("\n").filter(p => p.trim().length > 0);

  const safeTitle = String(bookTitle ?? "");
  const safeChTitle = String(chapter.title ?? "");
  const safeChNum = String(chapter.number ?? "");
  const pageChildren = [
    React.createElement(View, { key: "hdr", style: bookStyles.pageHeader },
      React.createElement(Text, { key: "hdr-book", style: bookStyles.headerText }, safeTitle.toUpperCase()),
      React.createElement(Text, { key: "hdr-ch", style: bookStyles.headerText }, safeChTitle.toUpperCase()),
    ),
    React.createElement(Text, { key: "chnum", style: bookStyles.chapterNumber }, `Chapter ${safeChNum}`),
    React.createElement(Text, { key: "chtitle", style: bookStyles.chapterTitle }, safeChTitle),
    React.createElement(View, { key: "divider", style: bookStyles.chapterDivider }),
    ...(chapter.imageUrl ? [React.createElement(Image, { key: "chimg", src: chapter.imageUrl, style: bookStyles.chapterImage })] : []),
    ...paragraphs.slice(0, 8).map((p, i) =>
      React.createElement(Text, { key: `p${i}`, style: bookStyles.bodyText }, p)
    ),
    React.createElement(Text, { key: "pgnum", style: bookStyles.pageNumber }, String(pageNum)),
  ];
  return React.createElement(Page, { size: [BOOK_W, BOOK_H], style: bookStyles.chapterPage }, ...pageChildren);
}

export async function generateBookPdf(book: GeneratedBook): Promise<Buffer> {
  const doc = React.createElement(Document,
    { title: book.title, author: book.author, subject: book.description },
    BookCoverPage({ book }),
    BookCopyrightPage({ book }),
    BookTocPage({ book }),
    ...book.chapters.map((ch, i) =>
      BookChapterPage({ chapter: ch, bookTitle: book.title, pageNum: i + 4 })
    ),
  );

  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ── Comic PDF ─────────────────────────────────────────────────────────────────

export interface ComicPanel {
  imageUrl: string;
  caption: string;
  dialogue?: string;
}

export interface ComicPage {
  pageNumber: number;
  panels: ComicPanel[];
}

export interface GeneratedComic {
  title: string;
  genre: string;
  author: string;
  coverUrl: string;
  synopsis: string;
  pages: ComicPage[];
  createdAt: string;
}

const comicStyles = StyleSheet.create({
  page: {
    width: COMIC_W, height: COMIC_H,
    backgroundColor: "#FFFFFF",
  },
  coverPage: {
    width: COMIC_W, height: COMIC_H,
    backgroundColor: "#0a0a14",
  },
  coverImage: {
    width: COMIC_W, height: COMIC_H * 0.78,
    objectFit: "cover",
  },
  coverBottom: {
    flex: 1, backgroundColor: "#0a0a14",
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 20,
  },
  comicTitle: {
    fontSize: 28, fontFamily: "Helvetica-Bold",
    color: "#FFFFFF", textAlign: "center",
    textTransform: "uppercase", letterSpacing: 2,
  },
  comicAuthor: {
    fontSize: 11, fontFamily: "Helvetica",
    color: "rgba(255,255,255,0.5)", textAlign: "center",
    marginTop: 6,
  },
  comicPage: {
    width: COMIC_W, height: COMIC_H,
    backgroundColor: "#FFFFFF",
    padding: 8, flexDirection: "row",
    flexWrap: "wrap", gap: 4,
  },
  panel2x3: {
    width: (COMIC_W - 20) / 2,
    height: (COMIC_H - 40) / 3,
    backgroundColor: "#f0f0f0",
    borderWidth: 2, borderColor: "#000",
    overflow: "hidden", position: "relative",
  },
  panelImage: {
    width: "100%", height: "80%",
    objectFit: "cover",
  },
  panelCaption: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1, borderTopColor: "#000",
    padding: 3, fontSize: 7,
    fontFamily: "Helvetica",
    color: "#111111", lineHeight: 1.3,
  },
  dialogueBubble: {
    position: "absolute", top: 6, left: 6, right: 6,
    backgroundColor: "#FFFFFF", borderRadius: 6,
    borderWidth: 1.5, borderColor: "#000",
    padding: 4, maxWidth: "70%",
  },
  dialogueText: {
    fontSize: 7, fontFamily: "Helvetica-Bold",
    color: "#000", lineHeight: 1.3,
  },
  comicPageNumber: {
    position: "absolute", bottom: 6, right: 10,
    fontSize: 8, fontFamily: "Helvetica-Bold", color: "#333",
  },
});

function ComicCoverPage({ comic }: { comic: GeneratedComic }) {
  return React.createElement(Page, { size: [COMIC_W, COMIC_H], style: comicStyles.coverPage },
    comic.coverUrl
      ? React.createElement(Image, { src: comic.coverUrl, style: comicStyles.coverImage })
      : React.createElement(View, { style: { ...comicStyles.coverImage, backgroundColor: "#1a0a2e" } }),
    React.createElement(View, { style: comicStyles.coverBottom },
      React.createElement(Text, { style: comicStyles.comicTitle }, comic.title),
      React.createElement(Text, { style: comicStyles.comicAuthor }, `by ${comic.author} · ${comic.genre}`),
    )
  );
}

function ComicPageEl({ comicPage, title }: { comicPage: ComicPage; title: string }) {
  return React.createElement(Page, { size: [COMIC_W, COMIC_H], style: comicStyles.comicPage },
    ...comicPage.panels.map((panel, i) => {
      const panelChildren = [
        panel.imageUrl
          ? React.createElement(Image, { key: "img", src: panel.imageUrl, style: comicStyles.panelImage })
          : React.createElement(View, { key: "imgbg", style: { ...comicStyles.panelImage, backgroundColor: "#ddd" } }),
        ...(panel.dialogue ? [React.createElement(View, { key: "dlg", style: comicStyles.dialogueBubble },
          React.createElement(Text, { style: comicStyles.dialogueText }, panel.dialogue),
        )] : []),
        React.createElement(Text, { key: "cap", style: comicStyles.panelCaption }, panel.caption),
      ];
      return React.createElement(View, { key: i, style: comicStyles.panel2x3 }, ...panelChildren);
    }),
    React.createElement(Text, { style: comicStyles.comicPageNumber }, String(comicPage.pageNumber)),
  );
}

export async function generateComicPdf(comic: GeneratedComic): Promise<Buffer> {
  const doc = React.createElement(Document,
    { title: comic.title, author: comic.author },
    ComicCoverPage({ comic }),
    ...comic.pages.map((p, i) =>
      ComicPageEl({ comicPage: p, title: comic.title })
    ),
  );

  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
