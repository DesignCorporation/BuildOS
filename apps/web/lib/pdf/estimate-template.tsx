// BuildOS - Estimate PDF Template
// React-PDF template for client-safe estimate (NO cost fields!)

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingBottom: 5,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 8,
  },
  tableCol: {
    fontSize: 9,
  },
  tableColHeader: {
    fontSize: 10,
    fontWeight: "bold",
  },
  col1: { width: "5%" },
  col2: { width: "35%" },
  col3: { width: "15%" },
  col4: { width: "15%" },
  col5: { width: "15%" },
  col6: { width: "15%" },
  totalsSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#f5f5f5",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2563eb",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
  },
});

interface EstimateItem {
  type: string;
  name: string;
  description?: string;
  unit: string;
  quantity: number;
  unitClient: number;
  totalClient: number;
}

interface EstimateData {
  version: number;
  createdAt: string;
  status: string;
  totalClient: number;
  items: EstimateItem[];
  projectName?: string;
  companyName?: string;
}

interface EstimatePdfProps {
  estimate: EstimateData;
}

export const EstimatePDF: React.FC<EstimatePdfProps> = ({ estimate }) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} PLN`;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "work":
        return "Работа";
      case "material":
        return "Материал";
      case "subcontractor":
        return "Субподряд";
      default:
        return type;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {estimate.companyName || "BuildOS"}
          </Text>
          <Text style={styles.subtitle}>
            Смета {estimate.projectName ? `на проект "${estimate.projectName}"` : ""}
          </Text>
          <Text style={styles.subtitle}>
            Версия {estimate.version} • {formatDate(estimate.createdAt)}
          </Text>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, styles.col1]}>#</Text>
            <Text style={[styles.tableColHeader, styles.col2]}>
              Наименование
            </Text>
            <Text style={[styles.tableColHeader, styles.col3]}>Тип</Text>
            <Text style={[styles.tableColHeader, styles.col4]}>
              Кол-во
            </Text>
            <Text style={[styles.tableColHeader, styles.col5]}>
              Цена за ед.
            </Text>
            <Text style={[styles.tableColHeader, styles.col6]}>Итого</Text>
          </View>

          {/* Table Rows */}
          {estimate.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCol, styles.col1]}>{index + 1}</Text>
              <View style={styles.col2}>
                <Text style={styles.tableCol}>{item.name}</Text>
                {item.description && (
                  <Text style={[styles.tableCol, { fontSize: 8, color: "#666", marginTop: 2 }]}>
                    {item.description}
                  </Text>
                )}
              </View>
              <Text style={[styles.tableCol, styles.col3]}>
                {getTypeLabel(item.type)}
              </Text>
              <Text style={[styles.tableCol, styles.col4]}>
                {item.quantity} {item.unit}
              </Text>
              <Text style={[styles.tableCol, styles.col5]}>
                {formatCurrency(item.unitClient)}
              </Text>
              <Text style={[styles.tableCol, styles.col6]}>
                {formatCurrency(item.totalClient)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ИТОГО К ОПЛАТЕ:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(estimate.totalClient)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Документ сгенерирован автоматически • BuildOS Platform
          </Text>
        </View>
      </Page>
    </Document>
  );
};
