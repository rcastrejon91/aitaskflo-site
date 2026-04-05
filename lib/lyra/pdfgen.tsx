/**
 * lib/lyra/pdfgen.tsx
 *
 * Generates Amazon KDP-ready PDFs for books and comics.
 * Uses @react-pdf/renderer for layout.
 * Output: 6×9" trim (standard KDP paperback) for books, 6.625×10.25" for comics.
 */

import React from "react";
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";
import type { GeneratedBook } from "./bookgen";

// ── KDP Dimensions ───────────────────────────────────────────────────────────
const BOOK_W = 6 * 72;    // 432pt = 6"
const BOOK_H = 9 * 72;    // 648pt = 9"
const COMIC_W = 6.625 * 72;
const COMIC_H = 10.25 * 72;
const MARGIN = 54;         // 0.75" margins
const INNER_MARGIN = 54;   // inside margin

// ── Book Styles ───────────────────────────────────────────────────────────────

const B = StyleSheet.create({
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
  tocPageNum: {
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

// ── Book Components ───────────────────────────────────────────────────────────

function CoverPage({ book }: { book: GeneratedBook }) {
  const title = String(book.title ?? "Untitled");
  const subtitle = book.subtitle ? String(book.subtitle) : null;
  const author = String(book.author ?? "Lyra");
  return (
    <Page size={[BOOK_W, BOOK_H]} style={B.coverPage}>
      {book.coverUrl
        ? <Image src={book.coverUrl} style={B.coverImage} />
        : <View style={{ ...B.coverImage, backgroundColor: "#1a0a2e" }} />
      }
      <View style={B.coverOverlay}>
        <Text style={B.coverTitle}>{title}</Text>
        {subtitle ? <Text style={B.coverSubtitle}>{subtitle}</Text> : null}
        <Text style={B.coverAuthor}>{"by " + author}</Text>
      </View>
    </Page>
  );
}

function CopyrightPage({ book }: { book: GeneratedBook }) {
  return (
    <Page size={[BOOK_W, BOOK_H]} style={B.copyrightPage}>
      <Text style={B.copyrightText}>{String(book.title ?? "")}</Text>
      <Text style={B.copyrightText}>{String(book.subtitle ?? "")}</Text>
      <Text style={{ ...B.copyrightText, marginTop: 16 }}>
        {"Copyright \u00A9 " + new Date().getFullYear() + " " + String(book.author ?? "Lyra")}
      </Text>
      <Text style={B.copyrightText}>
        {"All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form or by any means without the prior written permission of the author."}
      </Text>
      <Text style={{ ...B.copyrightText, marginTop: 16 }}>
        {"Generated by Lyra AI \u00B7 aitaskflo.com"}
      </Text>
      <Text style={B.copyrightText}>{"First Edition"}</Text>
    </Page>
  );
}

function TocPage({ book }: { book: GeneratedBook }) {
  return (
    <Page size={[BOOK_W, BOOK_H]} style={B.tocPage}>
      <Text style={B.tocTitle}>{"Contents"}</Text>
      {book.chapters.map((ch, i) => (
        <View key={String(i)} style={B.tocRow}>
          <Text style={B.tocChapter}>
            {String(ch.number ?? i + 1) + ". " + String(ch.title ?? "")}
          </Text>
          <Text style={B.tocPageNum}>{String(i + 4)}</Text>
        </View>
      ))}
    </Page>
  );
}

function ChapterPage({ chapter, bookTitle, pageNum }: {
  chapter: GeneratedBook["chapters"][0];
  bookTitle: string;
  pageNum: number;
}) {
  const safeTitle = String(bookTitle ?? "");
  const safeChTitle = String(chapter.title ?? "");
  const safeChNum = String(chapter.number ?? "");
  const paragraphs = String(chapter.content ?? "")
    .split("\n")
    .filter(p => p.trim().length > 0)
    .slice(0, 8);

  return (
    <Page size={[BOOK_W, BOOK_H]} style={B.chapterPage}>
      <View style={B.pageHeader}>
        <Text style={B.headerText}>{safeTitle.toUpperCase()}</Text>
        <Text style={B.headerText}>{safeChTitle.toUpperCase()}</Text>
      </View>
      <Text style={B.chapterNumber}>{"Chapter " + safeChNum}</Text>
      <Text style={B.chapterTitle}>{safeChTitle}</Text>
      <View style={B.chapterDivider} />
      {chapter.imageUrl
        ? <Image src={chapter.imageUrl} style={B.chapterImage} />
        : null
      }
      {paragraphs.map((p, i) => (
        <Text key={String(i)} style={B.bodyText}>{p}</Text>
      ))}
      <Text style={B.pageNumber}>{String(pageNum)}</Text>
    </Page>
  );
}

export async function generateBookPdf(book: GeneratedBook): Promise<Buffer> {
  const doc = (
    <Document title={String(book.title ?? "")} author={String(book.author ?? "Lyra")} subject={String(book.description ?? "")}>
      <CoverPage book={book} />
      <CopyrightPage book={book} />
      <TocPage book={book} />
      {book.chapters.map((ch, i) => (
        <ChapterPage key={String(i)} chapter={ch} bookTitle={String(book.title ?? "")} pageNum={i + 4} />
      ))}
    </Document>
  );

  return renderToBuffer(doc) as Promise<Buffer>;
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

const C = StyleSheet.create({
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
  panel: {
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
  pageNumber: {
    position: "absolute", bottom: 6, right: 10,
    fontSize: 8, fontFamily: "Helvetica-Bold", color: "#333",
  },
});

function ComicCover({ comic }: { comic: GeneratedComic }) {
  return (
    <Page size={[COMIC_W, COMIC_H]} style={C.coverPage}>
      {comic.coverUrl
        ? <Image src={comic.coverUrl} style={C.coverImage} />
        : <View style={{ ...C.coverImage, backgroundColor: "#1a0a2e" }} />
      }
      <View style={C.coverBottom}>
        <Text style={C.comicTitle}>{comic.title}</Text>
        <Text style={C.comicAuthor}>{"by " + comic.author + " \u00B7 " + comic.genre}</Text>
      </View>
    </Page>
  );
}

function ComicPageEl({ comicPage }: { comicPage: ComicPage }) {
  return (
    <Page size={[COMIC_W, COMIC_H]} style={C.comicPage}>
      {comicPage.panels.map((panel, i) => (
        <View key={String(i)} style={C.panel}>
          {panel.imageUrl
            ? <Image src={panel.imageUrl} style={C.panelImage} />
            : <View style={{ ...C.panelImage, backgroundColor: "#ddd" }} />
          }
          {panel.dialogue
            ? (
              <View style={C.dialogueBubble}>
                <Text style={C.dialogueText}>{panel.dialogue}</Text>
              </View>
            )
            : null
          }
          <Text style={C.panelCaption}>{panel.caption}</Text>
        </View>
      ))}
      <Text style={C.pageNumber}>{String(comicPage.pageNumber)}</Text>
    </Page>
  );
}

export async function generateComicPdf(comic: GeneratedComic): Promise<Buffer> {
  const doc = (
    <Document title={comic.title} author={comic.author}>
      <ComicCover comic={comic} />
      {comic.pages.map((p, i) => (
        <ComicPageEl key={String(i)} comicPage={p} />
      ))}
    </Document>
  );

  return renderToBuffer(doc) as Promise<Buffer>;
}
