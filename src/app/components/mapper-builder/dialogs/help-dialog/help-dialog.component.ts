// src/app/components/mapper-builder/dialogs/help-dialog/help-dialog.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

interface HelpTopic {
  id: string;
  title: string;
  icon: string;
  content: string;
  relatedTopics?: string[];
  videoUrl?: string;
}

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

@Component({
  selector: 'app-help-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatTabsModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl:'help-dialog.component.html',
  styleUrl:'help-dialog.component.scss'
})
export class HelpDialogComponent implements OnInit {
  searchControl = new FormControl('');
  selectedCategory = 'all';

  helpTopics: HelpTopic[] = [
    {
      id: 'creating-mapper',
      title: 'Creating a Mapper',
      icon: 'add_circle',
      content: `
        <p>To create a new mapper:</p>
        <ol>
          <li>Click the "New Mapper" button in the toolbar</li>
          <li>Select the case type for your mapper</li>
          <li>Give your mapper a descriptive name</li>
          <li>Click "Create" to start building your mapper</li>
        </ol>
        <p>Once created, you can add targets and define field mappings.</p>
      `,
      relatedTopics: ['Adding Targets', 'Field Mapping']
    },
    {
      id: 'field-mapping',
      title: 'Field Mapping',
      icon: 'rule',
      content: `
        <p>Field mapping defines how data from your JSON case is transformed to Django model fields.</p>
        <p><strong>Basic Mapping:</strong></p>
        <ul>
          <li>JSON Path: The path to extract data from (e.g., user.name)</li>
          <li>Target Field: The Django model field to populate</li>
          <li>Default Value: Used when the source is empty</li>
        </ul>
        <p><strong>Advanced Features:</strong></p>
        <ul>
          <li>Transform Functions: Apply transformations to the data</li>
          <li>Conditions: Map only when certain conditions are met</li>
          <li>Lookups: Translate codes between systems</li>
        </ul>
      `,
      relatedTopics: ['Transform Functions', 'Conditions']
    }
  ];

  filteredTopics: HelpTopic[] = [];

  faqs: FAQ[] = [
    {
      question: 'How do I handle nested JSON data?',
      answer: 'Use dot notation in your JSON path. For example, "user.profile.address.city" will extract the city from nested objects.',
      category: 'Field Mapping'
    },
    {
      question: 'Can I map one source field to multiple targets?',
      answer: 'Yes! Create multiple field rules with the same JSON path but different target fields.',
      category: 'Field Mapping'
    },
    {
      question: 'What happens if a required field is missing?',
      answer: 'You can set a default value that will be used when the source data is missing or empty.',
      category: 'Validation'
    }
  ];

  faqCategories = ['Field Mapping', 'Validation', 'Performance', 'Troubleshooting'];

  videoTutorials = [
    {
      id: '1',
      title: 'Getting Started',
      duration: '5 min',
      description: 'Learn the basics of Case Mapper',
      icon: 'play_circle',
      url: 'https://example.com/video1'
    },
    {
      id: '2',
      title: 'Advanced Mapping',
      duration: '10 min',
      description: 'Master complex field mappings',
      icon: 'play_circle',
      url: 'https://example.com/video2'
    }
  ];

  bestPractices = [
    {
      title: 'Use Descriptive Names',
      category: 'Naming Conventions',
      icon: 'label',
      priority: 'primary',
      description: 'Give your mappers and targets clear, descriptive names that indicate their purpose.',
      tips: [
        'Include the case type in the mapper name',
        'Use business-friendly terms',
        'Avoid abbreviations'
      ]
    },
    {
      title: 'Test with Real Data',
      category: 'Testing',
      icon: 'bug_report',
      priority: 'accent',
      description: 'Always test your mappers with realistic case data before deploying.',
      tips: [
        'Use the Preview feature',
        'Test edge cases',
        'Verify all required fields are mapped'
      ]
    }
  ];

  commonIssues = [
    {
      problem: 'Field mapping not working',
      symptoms: [
        'Target field remains empty',
        'No errors shown',
        'Preview shows no data'
      ],
      solution: 'Check that your JSON path is correct. Use the autocomplete suggestions to ensure the path exists in your case data.',
      example: 'Correct: user.profile.name\nIncorrect: user..profile.name'
    }
  ];

  constructor(
    private dialogRef: MatDialogRef<HelpDialogComponent>
  ) {}

  ngOnInit(): void {
    this.filteredTopics = [...this.helpTopics];

    this.searchControl.valueChanges.subscribe(search => {
      if (!search) {
        this.filteredTopics = [...this.helpTopics];
      } else {
        const searchLower = search.toLowerCase();
        this.filteredTopics = this.helpTopics.filter(topic =>
          topic.title.toLowerCase().includes(searchLower) ||
          topic.content.toLowerCase().includes(searchLower)
        );
      }
    });
  }

  getFilteredFAQs(): FAQ[] {
    if (this.selectedCategory === 'all') {
      return this.faqs;
    }
    return this.faqs.filter(faq => faq.category === this.selectedCategory);
  }

  openTopic(topicTitle: string): void {
    const topic = this.helpTopics.find(t => t.title === topicTitle);
    if (topic) {
      // Expand the topic
      console.log('Open topic:', topic);
    }
  }

  watchVideo(video: any): void {
    window.open(video.url, '_blank');
  }

  openDocumentation(): void {
    window.open('/docs/case-mapper', '_blank');
  }

  close(): void {
    this.dialogRef.close();
  }
}
