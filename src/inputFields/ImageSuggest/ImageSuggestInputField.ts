import { AbstractInputField } from '../AbstractInputField';
import ImageSuggestInput from './ImageSuggestInput.svelte';
import { InputFieldMarkdownRenderChild } from '../../InputFieldMarkdownRenderChild';
import { MetaBindArgumentError, MetaBindInternalError } from '../../utils/MetaBindErrors';
import { InputFieldArgumentType } from '../../parsers/InputFieldDeclarationParser';
import { Notice, TFile, TFolder } from 'obsidian';
import { ImageSuggestModal } from './ImageSuggestModal';
import { OptionQueryInputFieldArgument } from '../../inputFieldArguments/OptionQueryInputFieldArgument';
import { OptionInputFieldArgument } from '../../inputFieldArguments/OptionInputFieldArgument';

export class ImageSuggestInputField extends AbstractInputField {
	static allowInline: boolean = false;
	container: HTMLDivElement | undefined;
	component: ImageSuggestInput | undefined;
	value: string;
	options: string[];

	constructor(inputFieldMarkdownRenderChild: InputFieldMarkdownRenderChild) {
		super(inputFieldMarkdownRenderChild);

		this.value = '';
		this.options = [];
	}

	getValue(): string {
		return this.value;
	}

	setValue(value: string): void {
		value = value ?? this.getDefaultValue();
		this.value = value;
		this.component?.updateValue(value);
	}

	isEqualValue(value: string): boolean {
		return this.value == value;
	}

	getDefaultValue(): any {
		return '';
	}

	getHtmlElement(): HTMLElement {
		if (!this.container) {
			throw new MetaBindInternalError('');
		}

		return this.container;
	}

	isImageExtension(extension: string): boolean {
		const extensions = ['apng', 'avif', 'gif', 'jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'png', 'svg', 'webp'];
		return extensions.contains(extension);
	}

	async getOptions(): Promise<void> {
		const folderPaths: OptionQueryInputFieldArgument[] = this.renderChild.getArguments(InputFieldArgumentType.OPTION_QUERY);
		const images: string[] = [];

		for (const folderPath of folderPaths) {
			let folderPathString: string = folderPath.value;
			if (folderPathString.startsWith('"') && folderPathString.endsWith('"')) {
				folderPathString = folderPathString.substring(1, folderPathString.length - 1);
			} else {
				const error = new MetaBindArgumentError(`expected suggest option query for image suggester to start and end with double quotation marks`);
				new Notice(`meta-bind | ${error.message}`);
				console.warn(error);
				continue;
			}

			const folder = this.renderChild.plugin.app.vault.getAbstractFileByPath(folderPathString);
			if (folder == null) {
				const error = new MetaBindArgumentError(`expected suggest option query ${folderPathString} for image suggester to exist`);
				new Notice(`meta-bind | ${error.message}`);
				console.warn(error);
				continue;
			}

			if (!(folder instanceof TFolder)) {
				const error = new MetaBindArgumentError(`expected suggest option query ${folderPath.value} for image suggester to be a folder`);
				new Notice(`meta-bind | ${error.message}`);
				console.warn(error);
				continue;
			}

			for (const child of folder.children) {
				if (child instanceof TFile && this.isImageExtension(child.extension)) {
					images.push(child.path);
				}
			}
		}

		const imagePaths: OptionInputFieldArgument[] = this.renderChild.getArguments(InputFieldArgumentType.OPTION);

		for (const imagePath of imagePaths) {
			const imageFile = this.renderChild.plugin.app.vault.getAbstractFileByPath(imagePath.value);

			if (!imageFile) {
				const error = new MetaBindArgumentError(`expected suggest option ${imagePath.value} for image suggester to exist`);
				new Notice(`meta-bind | ${error.message}`);
				console.warn(error);
				continue;
			}

			if (!(imageFile instanceof TFile)) {
				const error = new MetaBindArgumentError(`expected suggest option ${imagePath.value} for image suggester to be a file`);
				new Notice(`meta-bind | ${error.message}`);
				console.warn(error);
				continue;
			}

			if (!this.isImageExtension(imageFile.extension)) {
				const error = new MetaBindArgumentError(`expected suggest option ${imagePath.value} for image suggester to be an image file`);
				new Notice(`meta-bind | ${error.message}`);
				console.warn(error);
				continue;
			}

			images.push(imagePath.value);
		}

		this.options = images;
	}

	async showSuggest(): Promise<void> {
		await this.getOptions();
		new ImageSuggestModal(this.renderChild.plugin.app, this.options, item => {
			this.setValue(item);
			this.onValueChange(item);
		}).open();
	}

	render(container: HTMLDivElement): void {
		console.debug(`meta-bind | SuggestInputField >> render ${this.renderChild.uuid}`);

		this.container = container;

		this.value = this.renderChild.getInitialValue();

		this.component = new ImageSuggestInput({
			target: container,
			props: {
				showSuggest: () => this.showSuggest(),
			},
		});

		this.component.updateValue(this.value);
	}

	public destroy(): void {
		this.component?.$destroy();
	}
}
