import {ComponentFixture, TestBed} from '@angular/core/testing';

import {TypedNextQuestionComponent} from './typed-next-question.component';

describe('TypedNextQuestionComponent', () => {
    let fixture: ComponentFixture<TypedNextQuestionComponent>;
    let component: TypedNextQuestionComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TypedNextQuestionComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(TypedNextQuestionComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('question', {
            id: 'q_reason',
            question: 'Причину остановки назвали?',
            type: 'chips_yes_no',
            answers: [
                {key: 'yes', label: 'Да'},
                {key: 'no', label: 'Нет'}
            ]
        });
        fixture.detectChanges();
    });

    it('renders the typed question and its yes/no labels', () => {
        const element = fixture.nativeElement as HTMLElement;
        const buttons = Array.from(element.querySelectorAll('button'));

        expect(element.textContent).toContain('Причину остановки назвали?');
        expect(buttons.map((button) => button.textContent?.trim())).toEqual(['Да', 'Нет']);
    });

    it('emits only the question id and answer key', () => {
        const emitted = jasmine.createSpy('answerClick');
        component.answerClick.subscribe(emitted);

        component.onAnswerClick('no');

        expect(emitted).toHaveBeenCalledOnceWith({
            question_id: 'q_reason',
            answer_key: 'no'
        });
    });
});
